import { useGetSoloTabulation } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User, FileCheck } from "lucide-react";

export default function SoloTabulation() {
  const { data: tabulation, isLoading, error } = useGetSoloTabulation({
    query: { refetchInterval: 5000 }
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

  const renderRankBadge = (rank: number) => {
    switch (rank) {
      case 1: return <Badge variant="gold" className="px-3 py-1">Champion</Badge>;
      case 2: return <Badge variant="silver">1st Runner Up</Badge>;
      case 3: return <Badge variant="bronze">2nd Runner Up</Badge>;
      case 4: return <Badge variant="outline">4th Place</Badge>;
      case 5: return <Badge variant="outline">5th Place</Badge>;
      default: return <Badge variant="outline">{rank}th Rank</Badge>;
    }
  };

  const sortedEntries = [...tabulation.entries].sort((a, b) => a.rank - b.rank);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-white tracking-tight flex items-center gap-3">
            <User className="h-8 w-8 text-secondary" />
            Solo (Mother Majorette) Tabulation
          </h1>
          <p className="text-muted-foreground mt-1">Official Leaderboard and Breakdown</p>
        </div>
        <div className="flex gap-4 text-sm text-white/60 bg-black/40 px-4 py-2 rounded-lg border border-white/5">
          <span className="flex items-center gap-2"><User className="h-4 w-4" /> {tabulation.totalJudges} Judges Active</span>
          <span className="flex items-center gap-2"><FileCheck className="h-4 w-4" /> {tabulation.totalScoresSubmitted} Scores Logged</span>
        </div>
      </div>

      <Card className="border-secondary/20 bg-black/40 shadow-2xl overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="border-0">
              <TableHeader className="bg-secondary/10 border-b border-secondary/20">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-secondary font-bold w-[80px]">Rank</TableHead>
                  <TableHead className="text-secondary font-bold w-[250px]">School (Entry No)</TableHead>
                  <TableHead className="text-center font-bold">Judges</TableHead>
                  <TableHead className="text-right font-bold">Avg Crit 1 (50%)</TableHead>
                  <TableHead className="text-right font-bold">Avg Crit 2 (20%)</TableHead>
                  <TableHead className="text-right font-bold">Avg Crit 3 (30%)</TableHead>
                  <TableHead className="text-right font-bold text-destructive">Avg Ded (-10)</TableHead>
                  <TableHead className="text-right text-secondary font-bold text-base">Final Score</TableHead>
                  <TableHead className="text-right font-bold">Award / Prize</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                      No scores submitted yet for Solo Category.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedEntries.map((entry, idx) => (
                    <TableRow 
                      key={entry.schoolCode} 
                      className={`border-white/5 group transition-colors hover:bg-white/5 ${idx === 0 ? 'bg-secondary/5' : ''}`}
                    >
                      <TableCell className="font-bold text-xl">{entry.rank}</TableCell>
                      <TableCell>
                        <div className="font-serif font-bold text-lg text-white group-hover:text-secondary transition-colors">
                          {entry.schoolName}
                        </div>
                        <div className="text-xs text-white/50 font-mono mt-0.5">Code: {entry.schoolCode} • Entry: {entry.entryNo}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-black/50">{entry.judgeCount}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-white/80">{entry.avgCriterion1.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-white/80">{entry.avgCriterion2.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-white/80">{entry.avgCriterion3.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-destructive">{entry.avgDeduction.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono font-black text-2xl text-secondary tracking-tighter">
                        {entry.avgTotalScore.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-1">
                          {renderRankBadge(entry.rank)}
                          {entry.prizeAmount && (
                            <span className="text-xs font-bold text-green-400">₱{entry.prizeAmount}</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
