import {
  getGetTabulationSummaryQueryKey,
  useGetTabulationSummary,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, User, ArrowRight, FileCheck } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { data: summary, isLoading, error } = useGetTabulationSummary({
    query: {
      queryKey: getGetTabulationSummaryQueryKey(),
      refetchInterval: 5000,
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-muted-foreground animate-pulse">Loading live results...</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-destructive bg-destructive/10 px-6 py-4 rounded-lg flex items-center gap-3">
          <Trophy className="h-6 w-6" />
          <p className="font-medium">Failed to load tabulation data. Retrying...</p>
        </div>
      </div>
    );
  }

  const renderRankBadge = (rank: number | null, missingJudgeCount: number) => {
    switch (rank) {
      case 1:
        return <Badge variant="gold" className="text-sm px-3 py-1 scale-110">1st Place</Badge>;
      case 2:
        return <Badge variant="silver" className="text-sm px-3 py-1">2nd Place</Badge>;
      case 3:
        return <Badge variant="bronze" className="text-sm px-3 py-1">3rd Place</Badge>;
      default:
        return (
          <Badge variant="outline" className="whitespace-nowrap text-white/50">
            Awaiting {missingJudgeCount}
          </Badge>
        );
    }
  };

  const renderCategoryPanel = (
    title: string,
    icon: React.ElementType,
    result: typeof summary.group,
    linkTo: string
  ) => {
    const Icon = icon;
    const sortedEntries = [...result.entries].sort((a, b) => {
      if (a.rank != null && b.rank != null) return a.rank - b.rank;
      if (a.rank != null) return -1;
      if (b.rank != null) return 1;
      if (a.judgeCount !== b.judgeCount) return b.judgeCount - a.judgeCount;
      return a.schoolCode.localeCompare(b.schoolCode);
    });
    
    return (
      <Card className="flex flex-col h-full border-primary/10 bg-gradient-to-b from-card to-background relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-32 bg-primary/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-primary/10 transition-colors duration-1000"></div>
        
        <CardHeader className="pb-4 relative z-10 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-lg">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl text-primary">{title}</CardTitle>
                <CardDescription className="text-white/60 mt-1">Live Rankings</CardDescription>
              </div>
            </div>
            <Link href={linkTo} className="flex items-center gap-1 text-xs text-primary/70 hover:text-primary transition-colors">
              Full Tabulation <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex gap-4 mt-4 text-sm text-white/50">
            <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> {result.totalJudges}/{result.requiredJudgeCount} Judges</span>
            <span className="flex items-center gap-1.5"><FileCheck className="h-4 w-4" /> {result.totalScoresSubmitted} Scores Submitted</span>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 p-0 relative z-10">
          {sortedEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <p>No scores submitted yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {sortedEntries.map((entry) => (
                <div 
                  key={entry.schoolCode} 
                  className={`p-5 flex items-center justify-between transition-colors hover:bg-white/5 ${entry.rank === 1 ? 'bg-primary/5' : ''}`}
                  data-testid={`row-dashboard-${result.category}-${entry.schoolCode}`}
                >
                  <div className="flex items-center gap-5">
                    <div className="w-24 text-center">
                      {renderRankBadge(entry.rank, entry.missingJudgeCount)}
                    </div>
                    <div>
                      <h4 className={`font-bold font-serif ${entry.rank === 1 ? 'text-2xl text-white' : 'text-lg text-white/90'}`}>
                        {entry.schoolName}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-white/50 bg-white/5 px-2 py-0.5 rounded-sm border border-white/10">
                          Entry #{entry.entryNo}
                        </span>
                        {entry.award && (
                          <span className="text-xs text-primary/80 font-medium">
                            {entry.award}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`font-bold font-mono tracking-tighter ${entry.rank === 1 ? 'text-3xl text-primary' : entry.isComplete ? 'text-2xl text-white/90' : 'text-2xl text-white/40'}`}>
                      {entry.judgeCount > 0 ? entry.avgTotalScore.toFixed(2) : "—"}
                    </div>
                    {!entry.isComplete && entry.judgeCount > 0 && (
                      <div className="text-[10px] uppercase tracking-wider text-white/35">
                        Provisional · {entry.judgeCount}/{result.requiredJudgeCount} judges
                      </div>
                    )}
                    {entry.isComplete && entry.prizeAmount && (
                      <div className="text-xs text-green-400 font-medium mt-1">
                        ₱{entry.prizeAmount}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="text-center space-y-4 mb-10">
        <h1 className="text-4xl md:text-6xl font-black font-serif text-white tracking-tight drop-shadow-lg">
          <span className="text-primary block mb-2">TAGOBTOB</span>
          Live Tabulation Dashboard
        </h1>
        <p className="text-lg text-white/60 max-w-2xl mx-auto">
          Paindigay nan Majorette ug Twirlers Competition
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {renderCategoryPanel("Group Category", Users, summary.group, "/tabulation/group")}
        {renderCategoryPanel("Solo Category", User, summary.solo, "/tabulation/solo")}
      </div>
    </div>
  );
}

