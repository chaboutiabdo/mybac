import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ALLOWED_ORIGIN is set per environment; '*' let any site on the internet
// spend this project's GEMINI_API_KEY.
const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? 'http://localhost:8081',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Vary': 'Origin',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authorize FIRST. /learn-ai is gated client-side only, so this function
    // is reachable by free users and by anyone at all; nothing about the
    // request body should be echoed back before the caller is known.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return json({ error: 'Authentication required' }, 401);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: 'Invalid credentials' }, 401);

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile || !['premium', 'admin'].includes(profile.role)) {
      return json({ error: 'This feature requires a premium subscription' }, 403);
    }

    const { question, subject, chapter } = await req.json();
    if (!question) return json({ error: 'Question is required' }, 400);

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    console.log('Processing question:', question);
    console.log('Subject:', subject, 'Chapter:', chapter);

    // Prepare system context for Algerian BAC curriculum
    const systemContext = `أنت معلم خبير متخصص في منهج البكالوريا الجزائري، تقوم بشرح ${subject === "Math" ? "الرياضيات" : "الفيزياء"} باللغة العربية.

    قواعد الإجابة المهمة:
    1. الإجابة دائماً باللغة العربية مع شرح واضح ومنظم
    2. استخدم النقاط النقطية لتنظيم الشرح
    3. عند كتابة الرموز والمعادلات الرياضية:
       • استخدم صيغة LaTeX للرموز والمعادلات
       • ضع الرموز داخل النص بين \\( ... \\)
       • ضع المعادلات المنفصلة بين \\[ ... \\]
       • استخدم الرموز الرياضية بدقة وعناية
    4. اكتب وحدات القياس بالفرنسية مثل m/s², kg, N
    5. قدم الحلول خطوة بخطوة مع:
       • شرح كل خطوة بوضوح
       • أمثلة موجزة ومفيدة
       • ربط المفاهيم بتطبيقات عملية
    6. احرص على الإيجاز والتركيز على النقاط الأساسية
    
    Current context: Subject: ${subject || 'General'}, Chapter: ${chapter || 'General'}`;

    const prompt = `${systemContext}\n\nStudent Question: ${question}\n\nPlease provide a comprehensive answer:`;

    // Call Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 800,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API error:', errorData);
      throw new Error(`Gemini API error: ${response.status} ${errorData}`);
    }

    const data = await response.json();
    console.log('Gemini response received');
    
    const aiAnswer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';

    const { error: insertError } = await supabase
      .from('ai_learning_conversations')
      .insert({
        user_id: user.id,
        question_text: question,
        answer_text: aiAnswer,
        subject: subject || null,
        chapter: chapter || null
      });

    if (insertError) {
      console.error('Error storing conversation:', insertError);
    }

    return new Response(
      JSON.stringify({ answer: aiAnswer }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in gemini-chat function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
