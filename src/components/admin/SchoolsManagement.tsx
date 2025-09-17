import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  School, 
  PlusCircle, 
  Search, 
  MapPin, 
  Users,
  Edit,
  Trash2
} from "lucide-react";
interface School {
  id: string;
  name: string;
  location: string;
  studentsCount: number;
  createdAt: string;
}

export function SchoolsManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newSchool, setNewSchool] = useState({ name: "", location: "" });
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch schools from Supabase
  useEffect(() => {
    const fetchSchools = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.from("schools").select("id, name, city, created_at");
      if (error) {
        setError("Failed to fetch schools");
      } else if (data) {
        // Optionally, fetch students count for each school if needed
        setSchools(
          data.map((s: any) => ({
            id: s.id,
            name: s.name,
            location: s.city,
            studentsCount: 0, // You can fetch real count if needed
            createdAt: s.created_at,
          }))
        );
      }
      setLoading(false);
    };
    fetchSchools();
  }, []);

  const filteredSchools = schools.filter(school =>
    school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddSchool = async () => {
    if (newSchool.name && newSchool.location) {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.from("schools").insert({
        name: newSchool.name,
        city: newSchool.location,
        contract_date: new Date().toISOString(),
      }).select();
      if (error) {
        setError("Failed to add school");
      } else if (data && data.length > 0) {
        // Optionally, fetch students count for the new school
        setSchools([
          ...schools,
          {
            id: data[0].id,
            name: data[0].name,
            location: data[0].city,
            studentsCount: 0,
            createdAt: data[0].created_at,
          },
        ]);
        setNewSchool({ name: "", location: "" });
        setIsAddDialogOpen(false);
      }
      setLoading(false);
    }
  };

  const handleDeleteSchool = async (id: string) => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.from("schools").delete().eq("id", id);
    if (error) {
      setError("Failed to delete school");
    } else {
      setSchools(schools.filter(school => school.id !== id));
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {error && <div className="text-red-500">{error}</div>}
      {loading && <div className="text-gray-500">Loading...</div>}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <School className="h-8 w-8" />
            Schools Management
          </h1>
          <p className="text-muted-foreground">Manage schools and their information</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-white">
              <PlusCircle className="h-4 w-4 mr-2" />
              Add School
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New School</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="schoolName">School Name</Label>
                <Input
                  id="schoolName"
                  value={newSchool.name}
                  onChange={(e) => setNewSchool({...newSchool, name: e.target.value})}
                  placeholder="Enter school name"
                />
              </div>
              <div>
                <Label htmlFor="schoolLocation">Location</Label>
                <Input
                  id="schoolLocation"
                  value={newSchool.location}
                  onChange={(e) => setNewSchool({...newSchool, location: e.target.value})}
                  placeholder="Enter school location"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddSchool} className="gradient-primary text-white">
                  Add School
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <School className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{schools.length}</p>
                <p className="text-sm text-muted-foreground">Total Schools</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-success" />
              <div>
                <p className="text-2xl font-bold">
                  {schools.reduce((sum, school) => sum + school.studentsCount, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-accent" />
              <div>
                <p className="text-2xl font-bold">
                  {new Set(schools.map(s => s.location)).size}
                </p>
                <p className="text-sm text-muted-foreground">Cities</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Schools List</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search schools by name or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Schools Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSchools.map((school) => (
                  <TableRow key={school.id}>
                    <TableCell className="font-medium">{school.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {school.location}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{school.studentsCount} students</Badge>
                    </TableCell>
                    <TableCell>{new Date(school.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteSchool(school.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}