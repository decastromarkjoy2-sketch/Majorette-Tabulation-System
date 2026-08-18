import { useState, useRef } from "react";
import { 
  useListJudges, 
  useCreateJudge, 
  useDeleteJudge,
  getListJudgesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, UserPlus, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function Judges() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newJudgeName, setNewJudgeName] = useState("");
  
  const { data: judges, isLoading } = useListJudges();
  const createJudge = useCreateJudge();
  const deleteJudge = useDeleteJudge();
  
  const handleAddJudge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJudgeName.trim()) return;
    
    createJudge.mutate({ data: { name: newJudgeName.trim() } }, {
      onSuccess: () => {
        setNewJudgeName("");
        queryClient.invalidateQueries({ queryKey: getListJudgesQueryKey() });
        toast({
          title: "Judge Added",
          description: "New judge has been successfully registered.",
        });
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.error || "Failed to add judge",
          variant: "destructive",
        });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Are you sure you want to remove this judge? All their submitted scores will remain, but they won't be able to submit new ones.")) return;
    
    deleteJudge.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListJudgesQueryKey() });
        toast({
          title: "Judge Removed",
          description: "The judge has been successfully deleted.",
        });
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.error || "Failed to remove judge",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-white tracking-tight flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            Judge Management
          </h1>
          <p className="text-muted-foreground mt-1">Register and manage competition judges.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <Card className="md:col-span-1 h-fit border-primary/20 bg-black/40">
          <CardHeader>
            <CardTitle className="text-xl">Add New Judge</CardTitle>
            <CardDescription>Enter the full name of the judge.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddJudge} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white/80">Judge Name</Label>
                <Input 
                  id="name" 
                  value={newJudgeName} 
                  onChange={(e) => setNewJudgeName(e.target.value)} 
                  placeholder="e.g. Dr. Maria Santos"
                  className="bg-black/50 border-white/10 text-white"
                  disabled={createJudge.isPending}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={!newJudgeName.trim() || createJudge.isPending}
              >
                {createJudge.isPending ? "Adding..." : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" /> Add Judge
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-white/5 bg-black/20">
          <CardHeader>
            <CardTitle className="text-xl flex items-center justify-between">
              Registered Judges
              <span className="text-sm font-normal text-muted-foreground font-sans">
                {judges?.length || 0} Total
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-8 text-muted-foreground">Loading judges...</div>
            ) : !judges || judges.length === 0 ? (
              <div className="text-center p-8 border border-dashed border-white/10 rounded-lg text-muted-foreground">
                No judges registered yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {judges.map((judge) => (
                    <TableRow key={judge.id} className="border-white/5 group">
                      <TableCell className="font-mono text-muted-foreground">#{judge.id}</TableCell>
                      <TableCell className="font-medium text-white/90">{judge.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(judge.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDelete(judge.id)}
                          disabled={deleteJudge.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
