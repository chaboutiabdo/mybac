-- Create table for storing AI learning conversations
CREATE TABLE public.ai_learning_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question_text TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  subject TEXT,
  chapter TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ai_learning_conversations ENABLE ROW LEVEL SECURITY;

-- Create policies for AI learning conversations
CREATE POLICY "Users can view their own conversations" 
ON public.ai_learning_conversations 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own conversations" 
ON public.ai_learning_conversations 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all conversations" 
ON public.ai_learning_conversations 
FOR SELECT 
USING (EXISTS ( 
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'::user_role
));

-- Create index for better performance
CREATE INDEX idx_ai_conversations_user_id ON public.ai_learning_conversations(user_id);
CREATE INDEX idx_ai_conversations_created_at ON public.ai_learning_conversations(created_at);