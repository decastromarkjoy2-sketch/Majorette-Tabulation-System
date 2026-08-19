import { 
  useListScores, 
  useDeleteScore,
  getListScoresQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Settings, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { OrganizerGate } from "@/components/auth/OrganizerGate";

export default function Admin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: scores, isLoading } = useListScores();
  const deleteScore = useDeleteScore();

  const handleDelete = (id: number) => {
    if (!confirm("Are you sure you want to delete this score entry? This will permanently affect the tabulation.")) return;
    
    deleteScore.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListScoresQueryKey() });
        toast({
          title: "Score Deleted",
          description: "The score entry has been removed successfully.",
        });
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.data?.error || "Failed to delete score.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-serif font-bold text-white tracking-tight flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" />
          System Admin
        </h1>
        <p className="text-muted-foreground mt-1">Audit log of all submitted scores.</p>
      </div>

      <OrganizerGate title="Unlock score administration">
      <Card className="border-white/10 bg-black/40">
        <CardHeader>
          <CardTitle className="text-xl flex items-center justify-between">
            Score Audit Trail
            <span className="text-sm font-normal text-muted-foreground">
              {scores?.length || 0} Total Entries
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading scores...</div>
          ) : !scores || scores.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-white/10 rounded-lg text-muted-foreground">
              No scores have been submitted yet.
            </div>
          ) : (
            <div className="rounded-md overflow-hidden border border-white/10">
              <Table>
                <TableHeader className="bg-black/60">
                  <TableRow className="border-white/10">
                    <TableHead>Time</TableHead>
                    <TableHead>Judge</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead className="text-right">C1</TableHead>
                    <TableHead className="text-right">C2</TableHead>
                    <TableHead className="text-right">C3</TableHead>
                    <TableHead className="text-right text-destructive">Ded</TableHead>
                    <TableHead className="text-right text-primary">Total</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scores.map((score) => (
                    <TableRow key={score.id} className="border-white/5 group">
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(score.createdAt), "HH:mm:ss")}
                      </TableCell>
                      <TableCell className="font-medium text-white/90">{score.judgeName}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                          score.category === 'group' ? 'bg-primary/20 text-primary' : 'bg-secondary/20 text-secondary'
                        }`}>
                          {score.category}
                        </span>
                      </TableCell>
                      <TableCell className="font-bold">{score.schoolName}</TableCell>
                      <TableCell className="text-right font-mono text-white/70">{score.rawCriterion1}</TableCell>
                      <TableCell className="text-right font-mono text-white/70">{score.rawCriterion2}</TableCell>
                      <TableCell className="text-right font-mono text-white/70">{score.rawCriterion3}</TableCell>
                      <TableCell className="text-right font-mono text-destructive">
                        {score.deductionCount > 0 ? `-${score.deductionCount * 10}` : '0'}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-primary">
                        {score.totalScore.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDelete(score.id)}
                          disabled={deleteScore.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      </OrganizerGate>
    </div>
  );
}
