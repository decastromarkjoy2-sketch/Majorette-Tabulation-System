import {
  getGetSoloTabulationQueryKey,
  useGetSoloTabulation,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, FileCheck, Trophy, User, Printer } from "lucide-react";
import { OfficialResultsPrintout } from "@/components/printing/OfficialResultsPrintout";

export default function SoloTabulation() {
  const { data: tabulation, isLoading, error } = useGetSoloTabulation({
    query: {
      queryKey: getGetSoloTabulationQueryKey(),
      refetchInterval: 5000,
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-muted-foreground animate-pulse">Loading tabulation...</p>
      </div>
    );
  }

  if (error || !tabulation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-destructive bg-destructive/10 px-6 py-4 rounded-lg">
          Failed to load solo tabulation.
        </div>
      </div>
    );
  }

  const renderRankBadge = (rank: number | null) => {
    switch (rank) {
      case 1: return <Badge variant="gold" className="px-3 py-1">Champion</Badge>;
      case 2: return <Badge variant="silver">1st Runner Up</Badge>;
      case 3: return <Badge variant="bronze">2nd Runner Up</Badge>;
      case 4: return <Badge variant="outline">4th Place</Badge>;
      case 5: return <Badge variant="outline">5th Place</Badge>;
      default: return null;
    }
  };

  const sortedEntries = [...tabulation.entries].sort((a, b) => {
    if (a.rank != null && b.rank != null) return a.rank - b.rank;
    if (a.rank != null) return -1;
    if (b.rank != null) return 1;
    if (a.judgeCount !== b.judgeCount) return b.judgeCount - a.judgeCount;
    return a.schoolCode.localeCompare(b.schoolCode);
  });
  const completedEntries = sortedEntries.filter((entry) => entry.isComplete);
  const topThree = completedEntries.filter(
    (entry) => entry.rank != null && entry.rank <= 3,
  );
  const allEntriesComplete = completedEntries.length === sortedEntries.length;
  const officialEntries = completedEntries
    .filter((entry) => entry.rank != null)
    .sort((a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER));

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground tracking-tight flex items-center gap-3">
            <User className="h-8 w-8 text-secondary" />
            Solo (Mother Majorette) Tabulation
          </h1>
          <p className="text-muted-foreground mt-1">Three-judge average, deductions, and automatic awards</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="flex gap-4 text-sm text-muted-foreground bg-card px-4 py-2 rounded-lg border border-border shadow-sm">
            <span className="flex items-center gap-2"><User className="h-4 w-4" /> {tabulation.totalJudges}/{tabulation.requiredJudgeCount} Judges Registered</span>
            <span className="flex items-center gap-2"><FileCheck className="h-4 w-4" /> {tabulation.totalScoresSubmitted} Scores Logged</span>
          </div>
          <Button type="button" variant="outline" onClick={() => window.print()} data-testid="button-print-solo-results">
            <Printer className="h-4 w-4" />
            Print Official Results
          </Button>
        </div>
      </div>

      <div
        className={`rounded-lg border px-4 py-3 text-sm ${
          allEntriesComplete
            ? "border-green-700/30 bg-green-50 text-green-800"
            : "border-secondary/30 bg-secondary/5 text-foreground/80"
        }`}
        data-testid="status-solo-completion"
      >
        <span className="font-bold text-foreground">
          {completedEntries.length}/{sortedEntries.length} entries fully judged.
        </span>{" "}
        {allEntriesComplete
          ? "All placements and awards are final."
          : "Only entries with all three judge scores receive an official rank or award."}
      </div>

      <Card className="border-secondary/20 bg-secondary/5" data-testid="card-solo-tie-break-policy">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />
            <div className="space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold text-foreground">{tabulation.tieBreakPolicy.title}</h2>
                <Badge className="border-green-700/30 bg-green-50 text-green-800">
                  {tabulation.tieBreakPolicy.status}
                </Badge>
              </div>
              <p className="text-foreground/80">{tabulation.tieBreakPolicy.description}</p>
              <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
                {tabulation.tieBreakPolicy.steps.map((step) => <li key={step}>{step}</li>)}
              </ol>
              <p className="text-xs text-muted-foreground">Approved by {tabulation.tieBreakPolicy.approvedBy}.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {topThree.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-secondary">
            <Trophy className="h-4 w-4" />
            {allEntriesComplete ? "Official Awardees" : "Current Automatic Placements"}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {topThree.map((entry) => (
              <Card
                key={entry.schoolCode}
                className="border-secondary/20 bg-secondary/5"
                data-testid={`card-solo-award-${entry.rank}`}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      {renderRankBadge(entry.rank)}
                      {entry.tieBreakApplied && (
                        <Badge variant="outline" title={entry.tieBreakReason ?? undefined}>
                          Tie-break applied
                        </Badge>
                      )}
                    </div>
                    <div className="font-serif text-xl font-bold text-foreground">
                      {entry.schoolName}
                    </div>
                    <div className="text-xs text-muted-foreground">Entry {entry.entryNo}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-2xl font-black text-secondary">
                      {entry.avgTotalScore.toFixed(2)}
                    </div>
                    {entry.prizeAmount && (
                      <div className="text-xs font-bold text-green-700">
                        ₱{entry.prizeAmount}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Card className="border-secondary/30 bg-card shadow-md overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="border-0">
              <TableHeader className="bg-secondary/10 border-b border-secondary/20">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-secondary font-bold w-[80px]">Rank</TableHead>
                  <TableHead className="text-secondary font-bold w-[250px]">School (Entry No)</TableHead>
                  <TableHead className="text-center font-bold">Judged</TableHead>
                  <TableHead className="text-right font-bold">Avg Crit 1 (50 pts)</TableHead>
                  <TableHead className="text-right font-bold">Avg Crit 2 (20 pts)</TableHead>
                  <TableHead className="text-right font-bold">Avg Crit 3 (30 pts)</TableHead>
                  <TableHead className="text-right font-bold text-destructive">Avg Ded (-10)</TableHead>
                  <TableHead className="text-right text-secondary font-bold text-base">Final Score</TableHead>
                  <TableHead className="text-right font-bold">Award / Prize</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                  {sortedEntries.map((entry) => (
                    <TableRow 
                      key={entry.schoolCode} 
                      className={`border-border group transition-colors hover:bg-accent/70 ${entry.rank === 1 ? 'bg-secondary/5' : ''}`}
                      data-testid={`row-solo-entry-${entry.schoolCode}`}
                    >
                      <TableCell className="font-bold text-xl">{entry.rank ?? "—"}</TableCell>
                      <TableCell>
                        <div className="font-serif font-bold text-lg text-foreground group-hover:text-secondary transition-colors">
                          {entry.schoolName}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">Code: {entry.schoolCode} • Entry: {entry.entryNo}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={entry.isComplete ? "border-green-700/30 bg-green-50 text-green-800" : "bg-muted text-muted-foreground"}
                        >
                          {entry.judgeCount}/{tabulation.requiredJudgeCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-foreground/80">{entry.judgeCount > 0 ? entry.avgCriterion1.toFixed(2) : "—"}</TableCell>
                      <TableCell className="text-right font-mono text-foreground/80">{entry.judgeCount > 0 ? entry.avgCriterion2.toFixed(2) : "—"}</TableCell>
                      <TableCell className="text-right font-mono text-foreground/80">{entry.judgeCount > 0 ? entry.avgCriterion3.toFixed(2) : "—"}</TableCell>
                      <TableCell className="text-right font-mono text-destructive">{entry.judgeCount > 0 ? entry.avgDeduction.toFixed(2) : "—"}</TableCell>
                      <TableCell className={`text-right font-mono font-black text-2xl tracking-tighter ${entry.isComplete ? "text-secondary" : "text-muted-foreground"}`}>
                        {entry.judgeCount > 0 ? entry.avgTotalScore.toFixed(2) : "—"}
                        {!entry.isComplete && entry.judgeCount > 0 && (
                          <span className="block text-[10px] font-sans uppercase tracking-wider text-muted-foreground">
                            Provisional
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-1">
                           {entry.isComplete ? (
                             <div className="flex flex-col items-end gap-1">
                               {renderRankBadge(entry.rank)}
                               {entry.tieBreakApplied && (
                                 <Badge
                                   variant="outline"
                                   title={entry.tieBreakReason ?? undefined}
                                    className="whitespace-nowrap text-amber-800"
                                 >
                                   Tie-break applied
                                 </Badge>
                               )}
                             </div>
                          ) : (
                            <Badge variant="outline" className="whitespace-nowrap text-muted-foreground">
                              Awaiting {entry.missingJudgeCount} judge{entry.missingJudgeCount === 1 ? "" : "s"}
                            </Badge>
                          )}
                          {entry.isComplete && entry.prizeAmount && (
                            <span className="text-xs font-bold text-green-700">₱{entry.prizeAmount}</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <OfficialResultsPrintout
        category="Solo / Mother Majorette Category"
        entries={officialEntries}
        provisionalCount={sortedEntries.length - completedEntries.length}
      />
    </div>
  );
}
