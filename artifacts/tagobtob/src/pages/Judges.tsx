import { useState } from "react";
import { 
  useListJudges, 
  useCreateJudge, 
  useDeleteJudge,
  useResetJudgeAccessCode,
  getListJudgesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, Copy, KeyRound, Trash2, UserPlus, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { OrganizerGate } from "@/components/auth/OrganizerGate";

const REQUIRED_JUDGE_COUNT = 3;

export default function Judges() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newJudgeName, setNewJudgeName] = useState("");
  const [issuedCredential, setIssuedCredential] = useState<{
    judgeName: string;
    accessCode: string;
  } | null>(null);
  
  const { data: judges, isLoading } = useListJudges();
  const createJudge = useCreateJudge();
  const deleteJudge = useDeleteJudge();
  const resetAccessCode = useResetJudgeAccessCode();
  const judgeCount = judges?.length ?? 0;
  const rosterIsFull = judgeCount >= REQUIRED_JUDGE_COUNT;
  
  const handleAddJudge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJudgeName.trim() || rosterIsFull) return;
    
    createJudge.mutate({ data: { name: newJudgeName.trim() } }, {
      onSuccess: (judge) => {
        setNewJudgeName("");
        setIssuedCredential({ judgeName: judge.name, accessCode: judge.accessCode });
        queryClient.invalidateQueries({ queryKey: getListJudgesQueryKey() });
        toast({
          title: "Judge Added",
          description: "New judge has been successfully registered.",
        });
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.data?.error || "Failed to add judge",
          variant: "destructive",
        });
      }
    });
  };

  const handleResetAccessCode = (id: number, name: string, hasAccessCode: boolean) => {
    const message = hasAccessCode
      ? `Generate a new access code for ${name}? Their previous code will stop working immediately.`
      : `Generate an access code for ${name}?`;
    if (!confirm(message)) return;

    resetAccessCode.mutate(
      { id },
      {
        onSuccess: (judge) => {
          setIssuedCredential({ judgeName: judge.name, accessCode: judge.accessCode });
          queryClient.invalidateQueries({ queryKey: getListJudgesQueryKey() });
        },
        onError: (error) => {
          toast({
            title: "Access Code Failed",
            description: error.data?.error || "Failed to generate an access code.",
            variant: "destructive",
          });
        },
      },
    );
  };

  const handleDelete = (id: number) => {
    if (!confirm("Remove this judge? Their submitted scores will also be deleted, and affected entries will become incomplete until a replacement judge submits scores.")) return;
    
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
          description: error.data?.error || "Failed to remove judge",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground tracking-tight flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            Judge Management
          </h1>
          <p className="text-muted-foreground mt-1">Register exactly three distinct competition judges.</p>
        </div>
        <div
          className={`rounded-lg border px-4 py-3 text-right ${
            rosterIsFull
              ? "border-green-500/30 bg-green-500/10"
              : "border-primary/30 bg-primary/10"
          }`}
          data-testid="status-judge-roster"
        >
          <div className="text-2xl font-mono font-black text-foreground">
            {judgeCount}/{REQUIRED_JUDGE_COUNT}
          </div>
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {rosterIsFull ? "Roster Ready" : "Judges Registered"}
          </div>
        </div>
      </div>

      <OrganizerGate title="Unlock judge management">
      <div
        className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
          rosterIsFull
            ? "border-green-700/30 bg-green-50 text-green-800"
            : "border-amber-700/30 bg-amber-50 text-amber-900"
        }`}
      >
        <CheckCircle2 className="h-5 w-5 shrink-0" />
        <p className="text-sm">
          {rosterIsFull
            ? "The three-judge panel is complete. Score submission is enabled."
            : `${REQUIRED_JUDGE_COUNT - judgeCount} judge slot${REQUIRED_JUDGE_COUNT - judgeCount === 1 ? "" : "s"} remaining. Scoring stays locked until all three judges are registered.`}
        </p>
      </div>

      {issuedCredential && (
        <Card className="border-primary/30 bg-primary/5" data-testid="card-issued-judge-code">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <KeyRound className="h-5 w-5 text-primary" />
              Save {issuedCredential.judgeName}&apos;s access code now
            </CardTitle>
            <CardDescription>
              This code is shown only here. Share it privately with the judge; generating another
              code will invalidate this one.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Input
              readOnly
              value={issuedCredential.accessCode}
              className="font-mono"
              data-testid="input-issued-judge-code"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => navigator.clipboard.writeText(issuedCredential.accessCode)}
              data-testid="button-copy-judge-code"
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
            <Button type="button" variant="ghost" onClick={() => setIssuedCredential(null)}>
              I saved it
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-8">
        <Card className="md:col-span-1 h-fit border-primary/30 bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Add New Judge</CardTitle>
            <CardDescription>
              {rosterIsFull
                ? "All three judge slots are filled."
                : "Enter the full name of a distinct judge."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddJudge} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground/80">Judge Name</Label>
                <Input 
                  id="name" 
                  value={newJudgeName} 
                  onChange={(e) => setNewJudgeName(e.target.value)} 
                  placeholder="e.g. Dr. Maria Santos"
                  className="bg-background border-input text-foreground"
                  disabled={createJudge.isPending || rosterIsFull}
                  data-testid="input-judge-name"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={!newJudgeName.trim() || createJudge.isPending || rosterIsFull}
                data-testid="button-add-judge"
              >
                {rosterIsFull ? "Roster Full" : createJudge.isPending ? "Adding..." : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" /> Add Judge
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl flex items-center justify-between">
              Registered Judges
              <span className="text-sm font-normal text-muted-foreground font-sans">
                {judgeCount}/{REQUIRED_JUDGE_COUNT} Registered
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-8 text-muted-foreground">Loading judges...</div>
            ) : !judges || judges.length === 0 ? (
              <div className="text-center p-8 border border-dashed border-border rounded-lg text-muted-foreground">
                No judges registered yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Registered</TableHead>
                     <TableHead>Access</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {judges.map((judge) => (
                    <TableRow key={judge.id} className="border-border group">
                      <TableCell className="font-mono text-muted-foreground">#{judge.id}</TableCell>
                      <TableCell className="font-medium text-foreground">{judge.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(judge.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <span className={judge.hasAccessCode ? "text-green-700" : "text-amber-800"}>
                          {judge.hasAccessCode ? "Ready" : "Code needed"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleResetAccessCode(judge.id, judge.name, judge.hasAccessCode)}
                          disabled={resetAccessCode.isPending}
                          title={judge.hasAccessCode ? "Replace access code" : "Generate access code"}
                          data-testid={`button-reset-judge-code-${judge.id}`}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDelete(judge.id)}
                          disabled={deleteJudge.isPending}
                          data-testid={`button-delete-judge-${judge.id}`}
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
      </OrganizerGate>
    </div>
  );
}
