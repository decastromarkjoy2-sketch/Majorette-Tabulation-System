import { useEffect, useMemo, useState } from "react";
import {
  useListScores, 
  useDeleteScore,
  getListScoresQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Settings, Trash2, Printer, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { OrganizerGate } from "@/components/auth/OrganizerGate";
import { JudgeLogPrintout } from "@/components/printing/JudgeLogPrintout";

export default function Admin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: scores, isLoading } = useListScores();
  const deleteScore = useDeleteScore();
  const [selectedJudge, setSelectedJudge] = useState("all");
  const [printingJudge, setPrintingJudge] = useState<string | null>(null);

  const scoresByJudge = useMemo(() => {
    const groups = new Map<string, NonNullable<typeof scores>>();
    for (const score of scores ?? []) {
      const current = groups.get(score.judgeName) ?? [];
      current.push(score);
      groups.set(score.judgeName, current);
    }
    return [...groups.entries()]
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([judgeName, judgeScores]) => [
        judgeName,
        [...judgeScores].sort(
          (first, second) =>
            new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
        ),
      ] as const);
  }, [scores]);

  const visibleJudgeGroups = selectedJudge === "all"
    ? scoresByJudge
    : scoresByJudge.filter(([judgeName]) => judgeName === selectedJudge);

  const requestJudgePrint = (judgeName: string) => {
    setPrintingJudge(judgeName);
  };

  useEffect(() => {
    if (!printingJudge) return;
    const clearPrintingJudge = () => setPrintingJudge(null);
    window.addEventListener("afterprint", clearPrintingJudge);
    const printTimer = window.setTimeout(() => window.print(), 0);
    return () => {
      window.clearTimeout(printTimer);
      window.removeEventListener("afterprint", clearPrintingJudge);
    };
  }, [printingJudge]);

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
        <h1 className="text-3xl font-serif font-bold text-foreground tracking-tight flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" />
          System Admin
        </h1>
        <p className="text-muted-foreground mt-1">Audit log of all submitted scores.</p>
      </div>

      <OrganizerGate title="Unlock score administration">
      <Card className="border-border bg-card shadow-sm">
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
            <div className="p-8 text-center border border-dashed border-border rounded-lg text-muted-foreground">
              No scores have been submitted yet.
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-4 rounded-lg border border-border bg-muted/40 p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">View scorecards by judge</p>
                    <p className="text-xs text-muted-foreground">Each section contains only that judge&apos;s submitted history.</p>
                  </div>
                </div>
                <label className="flex min-w-56 flex-col gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Filter judge
                  <select
                    value={selectedJudge}
                    onChange={(event) => setSelectedJudge(event.target.value)}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground"
                    data-testid="select-admin-judge-filter"
                  >
                    <option value="all">All Judges</option>
                    {scoresByJudge.map(([judgeName]) => (
                      <option value={judgeName} key={judgeName}>{judgeName}</option>
                    ))}
                  </select>
                </label>
              </div>

              {visibleJudgeGroups.map(([judgeName, judgeScores]) => (
                <section key={judgeName} className="rounded-lg border border-border overflow-hidden" data-testid={`judge-log-section-${judgeName}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/70 px-4 py-3">
                    <div>
                      <h3 className="font-serif text-xl font-bold text-foreground">{judgeName}</h3>
                      <p className="text-xs text-muted-foreground">{judgeScores.length} submitted {judgeScores.length === 1 ? "scorecard" : "scorecards"}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => requestJudgePrint(judgeName)}
                      data-testid={`button-print-judge-log-${judgeName}`}
                    >
                      <Printer className="h-4 w-4" />
                      Export / Print Judge Log
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-background">
                        <TableRow className="border-border">
                          <TableHead>Time</TableHead>
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
                        {judgeScores.map((score) => (
                          <TableRow key={score.id} className="border-border group">
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(score.createdAt), "MMM d, yyyy HH:mm:ss")}
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                                score.category === "group" ? "bg-primary/20 text-primary" : "bg-secondary/20 text-secondary"
                              }`}>
                                {score.category}
                              </span>
                            </TableCell>
                            <TableCell className="font-bold">{score.schoolName}</TableCell>
                            <TableCell className="text-right font-mono text-foreground/80">{score.rawCriterion1}</TableCell>
                            <TableCell className="text-right font-mono text-foreground/80">{score.rawCriterion2}</TableCell>
                            <TableCell className="text-right font-mono text-foreground/80">{score.rawCriterion3}</TableCell>
                            <TableCell className="text-right font-mono text-destructive">
                              {score.deductionCount > 0 ? `-${score.deductionCount * 10}` : "0"}
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
                                aria-label={`Delete ${judgeName}'s ${score.category} score for ${score.schoolName}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <JudgeLogPrintout
                    judgeName={judgeName}
                    scores={judgeScores}
                    active={printingJudge === judgeName}
                  />
                </section>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </OrganizerGate>
    </div>
  );
}
