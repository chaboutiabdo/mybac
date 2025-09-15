import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { GraduationCap, MessageCircle, Calendar, Phone, Star, Award, Crown } from "lucide-react";
import Navigation from "@/components/layout/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { Link } from "react-router-dom";

interface Alumni {
  id: string;
  name: string;
  bac_score: number;
  university: string;
  field_of_study: string;
  avatar_url?: string;
  advice: string;
  available_for_mentoring: boolean;
  linkedin_url?: string;
}

const Alumni = () => {
  const [selectedAlumni, setSelectedAlumni] = useState<Alumni | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showPremiumDialog, setShowPremiumDialog] = useState(false);
  const [alumni, setAlumni] = useState<Alumni[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingData, setBookingData] = useState({
    topic: "",
    timePreference: "",
    phone: "",
    message: ""
  });
  const { user } = useAuth();
  const { toast } = useToast();
  const { isPremium } = useSubscription();

  useEffect(() => {
    fetchAlumni();
  }, []);

  const fetchAlumni = async () => {
    try {
      const { data, error } = await supabase
        .from('alumni')
        .select('*')
        .eq('available_for_mentoring', true)
        .order('bac_score', { ascending: false });

      if (error) throw error;
      setAlumni(data || []);
    } catch (error) {
      console.error('Error fetching alumni:', error);
      toast({
        title: "Error",
        description: "Failed to load alumni",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBookMentoring = (alumni: Alumni) => {
    if (!isPremium) {
      setShowPremiumDialog(true);
      return;
    }
    setSelectedAlumni(alumni);
    setShowBookingForm(true);
  };

  const handleSubmitBooking = async () => {
    if (!user || !selectedAlumni) return;

    if (!bookingData.topic || !bookingData.timePreference || !bookingData.phone) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create proper time preference based on selection
      const now = new Date();
      let timePreferenceTimestamp;
      
      switch (bookingData.timePreference) {
        case 'morning':
          timePreferenceTimestamp = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 0, 0).toISOString();
          break;
        case 'afternoon':
          timePreferenceTimestamp = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 15, 0, 0).toISOString();
          break;
        case 'evening':
          timePreferenceTimestamp = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 19, 0, 0).toISOString();
          break;
        default:
          timePreferenceTimestamp = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // Next day
      }
      
      const { error } = await supabase
        .from('bookings')
        .insert({
          student_id: user.id,
          alumni_id: selectedAlumni.id,
          topic: bookingData.topic,
          time_preference: timePreferenceTimestamp,
          phone: bookingData.phone,
          notes: bookingData.message || null,
          status: 'pending'
        });

      if (error) {
        console.error('Supabase booking error:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Mentoring session request submitted successfully!",
      });

      setShowBookingForm(false);
      setBookingData({ topic: "", timePreference: "", phone: "", message: "" });
    } catch (error) {
      console.error('Error submitting booking:', error);
      toast({
        title: "Error", 
        description: `Failed to submit booking request. Please try again.`,
        variant: "destructive",
      });
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 18) return "text-success";
    if (score >= 16) return "text-warning";
    return "text-primary";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Alumni Mentorship
            </h1>
            <p className="text-muted-foreground text-lg">
              Learn from successful BAC graduates and get personalized guidance
            </p>
          </div>

          {!showBookingForm ? (
            loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : alumni.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No alumni mentors available at the moment.</p>
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {alumni.map((alumnus) => (
                <Card key={alumnus.id} className="group hover:shadow-lg transition-all duration-300 border-primary/10 animate-fade-in hover:scale-105">
                  <CardHeader className="text-center space-y-4">
                    <Avatar className="h-20 w-20 mx-auto">
                      <AvatarImage src={alumnus.avatar_url || "/placeholder.svg"} alt={alumnus.name} />
                      <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-primary/20 to-accent/20">
                        {alumnus.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <CardTitle className="text-xl">{alumnus.name}</CardTitle>
                      <CardDescription className="flex items-center justify-center gap-1 mt-2">
                        <GraduationCap className="h-4 w-4" />
                        Alumni Mentor
                      </CardDescription>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">BAC Score:</span>
                        <Badge className={`${getScoreColor(alumnus.bac_score)} font-bold`}>
                          <Award className="h-3 w-3 mr-1" />
                          {alumnus.bac_score}/20
                        </Badge>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-sm font-medium">University:</div>
                        <div className="text-sm text-muted-foreground">{alumnus.university}</div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-sm font-medium">Field of Study:</div>
                        <div className="text-sm text-muted-foreground">{alumnus.field_of_study}</div>
                      </div>
                    </div>

                    <div className="border-t pt-3">
                      <div className="text-sm font-medium mb-2">Advice:</div>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {alumnus.advice}
                      </p>
                    </div>

                    <Button 
                      onClick={() => handleBookMentoring(alumnus)}
                      className="w-full gradient-primary text-white hover:scale-105 transition-all"
                      variant="default"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Book Mentoring Session
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            )
          ) : (
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Book Mentoring Session with {selectedAlumni?.name}
                </CardTitle>
                <CardDescription>
                  Fill out the form below to schedule a mentoring session
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Discussion Topic</label>
                    <Select value={bookingData.topic} onValueChange={(value) => setBookingData({...bookingData, topic: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select topic" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="study-strategies">Study Strategies</SelectItem>
                        <SelectItem value="exam-preparation">Exam Preparation</SelectItem>
                        <SelectItem value="university-choice">University Choice</SelectItem>
                        <SelectItem value="career-guidance">Career Guidance</SelectItem>
                        <SelectItem value="motivation">Motivation & Mindset</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Preferred Time</label>
                    <Select value={bookingData.timePreference} onValueChange={(value) => setBookingData({...bookingData, timePreference: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">Morning (9AM-12PM)</SelectItem>
                        <SelectItem value="afternoon">Afternoon (2PM-5PM)</SelectItem>
                        <SelectItem value="evening">Evening (6PM-9PM)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Number
                  </label>
                  <Input
                    placeholder="Your phone number for the session"
                    value={bookingData.phone}
                    onChange={(e) => setBookingData({...bookingData, phone: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Additional Message (Optional)</label>
                  <Textarea
                    placeholder="Any specific questions or topics you'd like to discuss..."
                    value={bookingData.message}
                    onChange={(e) => setBookingData({...bookingData, message: e.target.value})}
                    className="min-h-[100px]"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowBookingForm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSubmitBooking}
                    className="flex-1"
                    disabled={!bookingData.topic || !bookingData.timePreference || !bookingData.phone}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Submit Request
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Premium Required Dialog */}
      <Dialog open={showPremiumDialog} onOpenChange={setShowPremiumDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              اشتراك مميز مطلوب
            </DialogTitle>
            <DialogDescription>
              يجب أن تكون مشتركاً مميزاً للوصول إلى هذه الميزة
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              يمكن للمشتركين المميزين فقط حجز جلسات الإرشاد مع الخريجين. قم بالترقية الآن للاستفادة من هذه الميزة.
            </p>
            <div className="flex gap-2">
              <Link to="/pricing" className="flex-1">
                <Button className="w-full">ترقية إلى المميز</Button>
              </Link>
              <Button 
                variant="outline" 
                onClick={() => setShowPremiumDialog(false)}
                className="flex-1"
              >
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Alumni;