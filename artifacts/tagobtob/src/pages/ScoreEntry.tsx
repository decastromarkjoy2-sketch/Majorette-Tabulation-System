import { useState, useMemo } from "react";
import { 
  useListJudges, 
  useSubmitScore,
  ScoreInputSchoolCode,
  ScoreInputCategory
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calculator, ClipboardCheck, AlertCircle } from "lucide-react";

const SCHOOLS = [
  { code: ScoreInputSchoolCode.NUMBER_01, name: "GNHS" },
  { code: ScoreInputSchoolCode.NUMBER_02, name: "PDSI" },
  { code: ScoreInputSchoolCode.NUMBER_03, name: "CTPNHS" },
  { code: ScoreInputSchoolCode.NUMBER_04, name: "PNHS" },
  { code: ScoreInputSchoolCode.NUMBER_05, name: "BNHS" },
];

const GROUP_CRITERIA = [
  { id: 1, label: "Twirling Variety & Difficulty", weight: 0.5, desc: "50%" },
  { id: 2, label: "Precision & Timing", weight: 0.2, desc: "20%" },
  { id: 3, label: "Choreography & Synchronization", weight: 0.3, desc: "30%" },
];

const SOLO_CRITERIA = [
  { id: 1, label: "Baton Difficulty & Variety, Speed & Control", weight: 0.5, desc: "50%" },
  { id: 2, label: "Body Technique & Grace", weight: 0.2, desc: "20%" },
  { id: 3, label: "Showmanship, Presentation & Routine Structure", weight: 0.3, desc: "30%" },
];

export default function ScoreEntry() {
  const { toast } = useToast();
  const { data: judges, isLoading: loadingJudges } = useListJudges();
  const submitScore = useSubmitScore();

  const [judgeId, setJudgeId] = useState<string>("");
  const [category, setCategory] = useState<"group" | "solo">("group");
  const [schoolCode, setSchoolCode] = useState<string>("");
  
  const [c1, setC1] = useState<string>("");
  const [c2, setC2] = useState<string>("");
  const [c3, setC3] = useState<string>("");
  
  const [hasDeduction, setHasDeduction] = useState(false);
  const [deductionCount, setDeductionCount] = useState<string>("1");

  const criteria = category === "group" ? GROUP_CRITERIA : SOLO_CRITERIA;

  const { totalScore, isValid } = useMemo(() => {
    const v1 = parseFloat(c1) || 0;
    const v2 = parseFloat(c2) || 0;
    const v3 = parseFloat(c3) || 0;
    const dCount = hasDeduction ? (parseInt(deductionCount, 10) || 0) : 0;
    
    const total = (v1 * 0.5) + (v2 * 0.2) + (v3 * 0.3) - (dCount * 10);
    
    const valid = !!(
      judgeId &&
      schoolCode &&
      c1 !== "" && v1 >= 0 && v1 <= 100 &&
      c2 !== "" && v2 >= 0 && v2 <= 100 &&
      c3 !== "" && v3 >= 0 && v3 <= 100 &&
      (!hasDeduction || (hasDeduction && dCount > 0))
    );
    
    return { totalScore: Math.max(0, total), isValid: valid };
  }, [c1, c2, c3, hasDeduction, deductionCount, judgeId, schoolCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    
    const selectedJudge = judges?.find(j => j.id.toString() === judgeId);
    if (!selectedJudge) return;

    submitScore.mutate({
      data: {
        judgeId: selectedJudge.id,
        judgeName: selectedJudge.name,
        category: category as any,
        schoolCode: schoolCode as any,
        rawCriterion1: parseFloat(c1),
        rawCriterion2: parseFloat(c2),
        rawCriterion3: parseFloat(c3),
        deductionCount: hasDeduction ? parseInt(deductionCount, 10) : 0
      }
    }, {
      onSuccess: () => {
        toast({
          title: "Score Submitted Successfully",
          description: `Score recorded for ${SCHOOLS.find(s => s.code === schoolCode)?.name} in ${category} category.`,
        });
        // Reset form for next entry
        setSchoolCode("");
        setC1("");
        setC2("");
        setC3("");
        setHasDeduction(false);
        setDeductionCount("1");
      },
      onError: (error) => {
        toast({
          title: "Submission Failed",
          description: error.error || "Failed to submit score",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-serif font-bold text-white tracking-tight flex items-center gap-3">
          <ClipboardCheck className="h-8 w-8 text-primary" />
          Score Entry Portal
        </h1>
        <p className="text-muted-foreground mt-1">Official judge submission portal. All scores are final upon submission.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border-primary/20 bg-card overflow-hidden">
          {/* Identity Section */}
          <div className="bg-black/40 p-6 border-b border-white/5 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-white/80 uppercase tracking-wider text-xs font-bold">1. Select Judge</Label>
                <select 
                  className="flex h-12 w-full rounded-md border border-white/10 bg-black/60 px-3 py-2 text-base text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50 transition-colors"
                  value={judgeId}
                  onChange={(e) => setJudgeId(e.target.value)}
                  disabled={loadingJudges}
                >
                  <option value="" disabled>-- Choose your name --</option>
                  {judges?.map(j => (
                    <option key={j.id} value={j.id}>{j.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-3">
                <Label className="text-white/80 uppercase tracking-wider text-xs font-bold">2. Category</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCategory("group")}
                    className={`flex-1 h-12 rounded-md font-semibold transition-all ${
                      category === "group" 
                        ? "bg-primary text-primary-foreground shadow-[0_0_15px_-3px_hsl(var(--primary)_/_0.4)]" 
                        : "bg-black/50 text-white/60 hover:bg-white/10 border border-white/5"
                    }`}
                  >
                    GROUP
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategory("solo")}
                    className={`flex-1 h-12 rounded-md font-semibold transition-all ${
                      category === "solo" 
                        ? "bg-primary text-primary-foreground shadow-[0_0_15px_-3px_hsl(var(--primary)_/_0.4)]" 
                        : "bg-black/50 text-white/60 hover:bg-white/10 border border-white/5"
                    }`}
                  >
                    SOLO (Mother Majorette)
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-white/80 uppercase tracking-wider text-xs font-bold">3. Select School / Entry</Label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {SCHOOLS.map(school => (
                  <button
                    key={school.code}
                    type="button"
                    onClick={() => setSchoolCode(school.code)}
                    className={`h-16 rounded-lg font-bold text-lg transition-all border ${
                      schoolCode === school.code
                        ? "bg-white text-black border-white shadow-lg scale-105"
                        : "bg-black/40 text-white/70 border-white/10 hover:bg-white/10 hover:border-white/20"
                    }`}
                  >
                    {school.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Scoring Section */}
          <div className="p-6 space-y-6 bg-gradient-to-b from-transparent to-black/20">
            <Label className="text-white/80 uppercase tracking-wider text-xs font-bold flex items-center gap-2">
              4. Enter Scores <Badge variant="outline" className="text-[10px] py-0">0-100</Badge>
            </Label>
            
            <div className="space-y-5">
              {[
                { state: c1, setter: setC1, crit: criteria[0] },
                { state: c2, setter: setC2, crit: criteria[1] },
                { state: c3, setter: setC3, crit: criteria[2] },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 bg-black/40 p-4 rounded-lg border border-white/5">
                  <div className="flex-1">
                    <div className="font-semibold text-white/90">{item.crit.label}</div>
                    <div className="text-primary text-sm font-bold mt-1">Weight: {item.crit.desc}</div>
                  </div>
                  <div className="w-32 relative">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={item.state}
                      onChange={(e) => item.setter(e.target.value)}
                      placeholder="0.0"
                      className="text-right text-2xl font-mono h-14 bg-black border-white/20 text-white font-bold"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Deductions */}
            <div className={`p-5 rounded-lg border transition-all ${
              hasDeduction ? "bg-destructive/10 border-destructive/30" : "bg-black/40 border-white/5"
            }`}>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setHasDeduction(!hasDeduction)}
                  className={`w-6 h-6 rounded flex items-center justify-center border ${
                    hasDeduction ? "bg-destructive border-destructive text-white" : "border-white/30 bg-black"
                  }`}
                >
                  {hasDeduction && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                </button>
                <div className="flex-1">
                  <div className="font-bold text-white/90">Rule Violation Deductions</div>
                  <div className="text-sm text-destructive font-medium mt-1">-10 points per violation</div>
                </div>
                {hasDeduction && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-white/70">Count:</Label>
                    <Input
                      type="number"
                      min="1"
                      value={deductionCount}
                      onChange={(e) => setDeductionCount(e.target.value)}
                      className="w-20 text-center font-mono h-10 border-destructive/50 bg-black/50"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <CardFooter className="bg-black/60 p-6 border-t border-white/10 flex flex-col md:flex-row gap-6 items-center justify-between">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="p-3 bg-primary/10 rounded-full">
                <Calculator className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-sm text-white/60 uppercase tracking-widest font-bold">Live Total Score</div>
                <div className="text-4xl font-mono font-black text-primary tracking-tighter">
                  {totalScore.toFixed(2)}
                </div>
              </div>
            </div>

            <Button 
              type="submit"
              variant="glow"
              size="xl"
              className="w-full md:w-auto"
              disabled={!isValid || submitScore.isPending}
            >
              {submitScore.isPending ? "Submitting..." : "Submit Final Score"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
