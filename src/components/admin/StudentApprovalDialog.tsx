import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Star, CheckCircle, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PendingStudent {
  id: string;
  name: string;
  email: string;
  school: string;
  registrationDate: string;
}

interface StudentApprovalDialogProps {
  children: React.ReactNode;
  student: PendingStudent;
}

const subscriptionTiers = [
  {
    id: "basic",
    name: "Basic",
    icon: "📚",
    features: ["Access to basic content", "Limited AI assistance", "Community support", "Basic video library"],
    color: "text-blue-600"
  },
  {
    id: "offer1",
    name: "Offer 1",
    icon: "⭐",
    features: ["Enhanced content access", "Advanced AI tutoring", "Priority support", "Extended video library", "Practice exams"],
    color: "text-purple-600"
  },
  {
    id: "offer2", 
    name: "Offer 2",
    icon: "🏆",
    features: ["Premium content access", "Unlimited AI tutoring", "1-on-1 mentoring sessions", "All video content", "Priority exam access", "Career guidance"],
    color: "text-gold-600"
  }
];

export function StudentApprovalDialog({ children, student }: StudentApprovalDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string>("");
  const [adminNotes, setAdminNotes] = useState("");
  const { toast } = useToast();

  const handleApprove = async () => {
    if (!selectedTier) {
      toast({
        title: "Error",
        description: "Please select a subscription tier",
        variant: "destructive",
      });
      return;
    }

    try {
      // Here you would typically call your API to approve the student
      // and assign them the selected subscription tier
      console.log("Approving student:", student.name, "with tier:", selectedTier, "notes:", adminNotes);
      
      toast({
        title: "Success",
        description: `Student ${student.name} approved with ${subscriptionTiers.find(t => t.id === selectedTier)?.name} subscription`,
      });
      
      setOpen(false);
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to approve student",
        variant: "destructive",
      });
    }
  };

  const handleReject = async () => {
    try {
      // Here you would typically call your API to reject the student
      console.log("Rejecting student:", student.name, "notes:", adminNotes);
      
      toast({
        title: "Success", 
        description: `Student ${student.name} application rejected`,
      });
      
      setOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject student", 
        variant: "destructive",
      });
    }
  };

  const selectedTierData = subscriptionTiers.find(tier => tier.id === selectedTier);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Review Student Application
          </DialogTitle>
          <DialogDescription>
            Review and approve or reject the student registration request
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Student Information */}
          <div className="space-y-4">
            <h3 className="font-semibold">Student Information</h3>
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <span className="text-sm font-medium text-muted-foreground">Name:</span>
                <p className="font-medium">{student.name}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Email:</span>
                <p className="font-medium">{student.email}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">School:</span>
                <p className="font-medium">{student.school}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Registration Date:</span>
                <p className="font-medium">{new Date(student.registrationDate).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Subscription Tier Selection */}
          <div className="space-y-4">
            <h3 className="font-semibold">Select Subscription Tier</h3>
            <Select value={selectedTier} onValueChange={setSelectedTier}>
              <SelectTrigger>
                <SelectValue placeholder="Choose subscription tier for this student" />
              </SelectTrigger>
              <SelectContent>
                {subscriptionTiers.map((tier) => (
                  <SelectItem key={tier.id} value={tier.id}>
                    <div className="flex items-center gap-2">
                      <span>{tier.icon}</span>
                      <span className={tier.color}>{tier.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Tier Preview */}
            {selectedTierData && (
              <Card className="border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{selectedTierData.icon}</span>
                    <h4 className={`font-semibold ${selectedTierData.color}`}>
                      {selectedTierData.name} Features
                    </h4>
                  </div>
                  <ul className="space-y-1">
                    {selectedTierData.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-3 w-3 text-success" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Admin Notes */}
          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium">
              Admin Notes (Optional)
            </label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this approval/rejection..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
            >
              Reject Application
            </Button>
            <Button 
              onClick={handleApprove}
              className="gradient-primary text-white"
              disabled={!selectedTier}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve Student
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}