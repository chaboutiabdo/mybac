import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { 
  Settings, 
  User, 
  Bell, 
  Database,
  Shield,
  Save,
  RefreshCw
} from "lucide-react";

export function AdminSettings() {
  const [settings, setSettings] = useState({
    // Profile settings
    adminName: "Admin User",
    adminEmail: "admin@baclearning.com",
    
    // Notification settings
    emailNotifications: true,
    studentRegistrations: true,
    examUploads: false,
    systemAlerts: true,
    
    // Platform settings
    platformName: "BAC Learning Platform",
    maxStudentsPerSchool: "500",
    allowSelfRegistration: true,
    requireEmailVerification: true,
    
    // System settings
    backupFrequency: "daily",
    sessionTimeout: "30",
    maintenanceMode: false
  });

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSettings = () => {
    // TODO: Save settings to Supabase when connected
    console.log("Saving settings:", settings);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Admin Settings
          </h1>
          <p className="text-muted-foreground">Configure platform settings and preferences</p>
        </div>
        <Button onClick={handleSaveSettings} className="gradient-primary text-white">
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adminName">Admin Name</Label>
              <Input
                id="adminName"
                value={settings.adminName}
                onChange={(e) => handleSettingChange("adminName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminEmail">Admin Email</Label>
              <Input
                id="adminEmail"
                type="email"
                value={settings.adminEmail}
                onChange={(e) => handleSettingChange("adminEmail", e.target.value)}
              />
            </div>
            <Button variant="outline" className="w-full">
              Change Password
            </Button>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="emailNotifications">Email Notifications</Label>
              <Switch
                id="emailNotifications"
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => handleSettingChange("emailNotifications", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="studentRegistrations">Student Registrations</Label>
              <Switch
                id="studentRegistrations"
                checked={settings.studentRegistrations}
                onCheckedChange={(checked) => handleSettingChange("studentRegistrations", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="examUploads">Exam Uploads</Label>
              <Switch
                id="examUploads"
                checked={settings.examUploads}
                onCheckedChange={(checked) => handleSettingChange("examUploads", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="systemAlerts">System Alerts</Label>
              <Switch
                id="systemAlerts"
                checked={settings.systemAlerts}
                onCheckedChange={(checked) => handleSettingChange("systemAlerts", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Platform Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Platform Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="platformName">Platform Name</Label>
              <Input
                id="platformName"
                value={settings.platformName}
                onChange={(e) => handleSettingChange("platformName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxStudents">Max Students per School</Label>
              <Input
                id="maxStudents"
                type="number"  
                value={settings.maxStudentsPerSchool}
                onChange={(e) => handleSettingChange("maxStudentsPerSchool", e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="selfRegistration">Allow Self Registration</Label>
              <Switch
                id="selfRegistration"
                checked={settings.allowSelfRegistration}
                onCheckedChange={(checked) => handleSettingChange("allowSelfRegistration", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="emailVerification">Require Email Verification</Label>  
              <Switch
                id="emailVerification"
                checked={settings.requireEmailVerification}
                onCheckedChange={(checked) => handleSettingChange("requireEmailVerification", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              System Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => handleSettingChange("sessionTimeout", e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="maintenanceMode">Maintenance Mode</Label>
              <Switch
                id="maintenanceMode"
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) => handleSettingChange("maintenanceMode", checked)}
              />
            </div>
            
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-3">System Actions</h4>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Clear Cache
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Database className="h-4 w-4 mr-2" />
                  Backup Database
                </Button>
                <Button variant="destructive" className="w-full justify-start">
                  <Shield className="h-4 w-4 mr-2" />
                  Reset System
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Version</p>
              <p className="font-medium">1.0.0</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Backup</p>
              <p className="font-medium">Today, 3:00 AM</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Uptime</p>
              <p className="font-medium">15 days, 7 hours</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}