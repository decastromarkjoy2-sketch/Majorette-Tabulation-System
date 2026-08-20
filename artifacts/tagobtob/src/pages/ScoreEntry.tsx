import { useState, useMemo } from "react";
import { 
  useListJudges, 
  useListScores,
  useSubmitScore,
  getListScoresQueryKey,
  getGetGroupTabulationQueryKey,
  getGetSoloTabulationQueryKey,
  getGetTabulationSummaryQueryKey,
  getGetSessionQueryKey,
  useCreateJudgeSession,
  useDeleteSession,
  useGetSession,
  ScoreInputSchoolCode,
  ScoreInputCategory
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calculator, CheckCircle2, ClipboardCheck, KeyRound, LockKeyhole, LogOut, Printer } from "lucide-react";

const SCHOOLS = [
  { code: ScoreInputSchoolCode.NUMBER_01, name: "GNHS" },
  { code: ScoreInputSchoolCode.NUMBER_02, name: "PDSI" },
  { code: ScoreInputSchoolCode.NUMBER_03, name: "CTPNHS" },
  { code: ScoreInputSchoolCode.NUMBER_04, name: "PNHS" },
  { code: ScoreInputSchoolCode.NUMBER_05, name: "BNHS" },
];

const GROUP_CRITERIA = [
  { id: 1, label: "Twirling Variety & Difficulty", max: 50, desc: "50 pts" },
  { id: 2, label: "Precision & Timing", max: 20, desc: "20 pts" },
  { id: 3, label: "Choreography & Synchronization", max: 30, desc: "30 pts" },
];

const SOLO_CRITERIA = [
  { id: 1, label: "Baton Difficulty & Variety, Speed & Control", max: 50, desc: "50 pts" },
  { id: 2, label: "Body Technique & Grace", max: 20, desc: "20 pts" },
  { id: 3, label: "Showmanship, Presentation & Routine Structure", max: 30, desc: "30 pts" },
];

const REQUIRED_JUDGE_COUNT = 3;

export default function ScoreEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: judges, isLoading: loadingJudges } = useListJudges();
  const { data: session, isLoading: loadingSession } = useGetSession();
  const createJudgeSession = useCreateJudgeSession();
  const deleteSession = useDeleteSession();
  const submitScore = useSubmitScore();

  const [judgeId, setJudgeId] = useState<string>("");
  const [accessCode, setAccessCode] = useState("");
  const [authError, setAuthError] = useState("");
  const [category, setCategory] = useState<"group" | "solo">("group");
  const [schoolCode, setSchoolCode] = useState<string>("");
  
  const [c1, setC1] = useState<string>("");
  const [c2, setC2] = useState<string>("");
  const [c3, setC3] = useState<string>("");
  
  const [hasDeduction, setHasDeduction] = useState(false);
  const [deductionCount, setDeductionCount] = useState<string>("1");

  const criteria = category === "group" ? GROUP_CRITERIA : SOLO_CRITERIA;
  const rosterReady = judges?.length === REQUIRED_JUDGE_COUNT;
  const selectedJudgeId =
    session?.role === "judge" && session.judgeId != null ? session.judgeId : undefined;
  const selectedJudge = judges?.find((judge) => judge.id === selectedJudgeId);
  const scoreQueryParams = useMemo(
    () => ({ category, judgeId: selectedJudgeId }),
    [category, selectedJudgeId],
  );
  const { data: existingScores, isLoading: loadingExistingScores } = useListScores(
    scoreQueryParams,
    {
      query: {
        enabled: selectedJudgeId != null,
        queryKey: getListScoresQueryKey(scoreQueryParams),
      },
    },
  );
  const scoredSchoolCodes = useMemo(
    () => new Set(existingScores?.map((score) => score.schoolCode) ?? []),
    [existingScores],
  );
  const selectedSchoolAlreadyScored = schoolCode
    ? scoredSchoolCodes.has(schoolCode)
    : false;
  const selectedSchool = SCHOOLS.find((school) => school.code === schoolCode);

  const { totalScore, isValid } = useMemo(() => {
    const v1 = parseFloat(c1) || 0;
    const v2 = parseFloat(c2) || 0;
    const v3 = parseFloat(c3) || 0;
    const dCount = hasDeduction ? (parseInt(deductionCount, 10) || 0) : 0;

    // Raw scores are already on the weighted scale (max 50, 20, 30).
    // Weighted score = raw score; total = sum of all three minus deductions.
    const total = v1 + v2 + v3 - (dCount * 10);

    const valid = !!(
      selectedJudgeId != null &&
      schoolCode &&
      rosterReady &&
      !selectedSchoolAlreadyScored &&
      c1 !== "" && v1 >= 0 && v1 <= criteria[0].max &&
      c2 !== "" && v2 >= 0 && v2 <= criteria[1].max &&
      c3 !== "" && v3 >= 0 && v3 <= criteria[2].max &&
      (!hasDeduction || (hasDeduction && dCount > 0))
    );

    return { totalScore: Math.max(0, total), isValid: valid };
  }, [
    c1,
    c2,
    c3,
    hasDeduction,
    deductionCount,
    selectedJudgeId,
    schoolCode,
    criteria,
    rosterReady,
    selectedSchoolAlreadyScored,
  ]);

  const handleJudgeSignIn = (event: React.FormEvent) => {
    event.preventDefault();
    if (!judgeId || accessCode.length < 8) return;
    setAuthError("");
    createJudgeSession.mutate(
      { data: { judgeId: Number(judgeId), accessCode } },
      {
        onSuccess: (nextSession) => {
          setAccessCode("");
          queryClient.setQueryData(getGetSessionQueryKey(), nextSession);
        },
        onError: (error) => {
          setAuthError(error.data?.error || "Judge sign-in failed.");
        },
      },
    );
  };

  const handleJudgeSignOut = () => {
    deleteSession.mutate(undefined, {
      onSuccess: (nextSession) => {
        queryClient.setQueryData(getGetSessionQueryKey(), nextSession);
        setJudgeId("");
        setSchoolCode("");
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    
    if (!selectedJudge) return;

    submitScore.mutate({
      data: {
        category: category as any,
        schoolCode: schoolCode as any,
        rawCriterion1: parseFloat(c1),
        rawCriterion2: parseFloat(c2),
        rawCriterion3: parseFloat(c3),
        deductionCount: hasDeduction ? parseInt(deductionCount, 10) : 0
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListScoresQueryKey() });
        queryClient.invalidateQueries({
          queryKey:
            category === "group"
              ? getGetGroupTabulationQueryKey()
              : getGetSoloTabulationQueryKey(),
        });
        queryClient.invalidateQueries({ queryKey: getGetTabulationSummaryQueryKey() });
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
          description: error.data?.error || "Failed to submit score",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <>
      <div className="score-entry-screen max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-serif font-bold text-white tracking-tight flex items-center gap-3">
          <ClipboardCheck className="h-8 w-8 text-primary" />
          Score Entry Portal
        </h1>
        <p className="text-muted-foreground mt-1">Official judge submission portal. All scores are final upon submission.</p>
      </div>

      <div
        className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
          rosterReady
            ? "border-green-500/20 bg-green-500/5 text-green-300"
            : "border-amber-500/20 bg-amber-500/5 text-amber-200"
        }`}
        data-testid="status-score-roster"
      >
        {rosterReady ? (
          <CheckCircle2 className="h-5 w-5 shrink-0" />
        ) : (
          <LockKeyhole className="h-5 w-5 shrink-0" />
        )}
        <div>
          <p className="text-sm font-semibold">
            {rosterReady
              ? "Three-judge panel ready"
              : `Scoring locked: ${judges?.length ?? 0}/${REQUIRED_JUDGE_COUNT} judges registered`}
          </p>
          <p className="text-xs text-white/50">
            Each judge may submit one score per school in each category.
          </p>
        </div>
      </div>

      {session?.role !== "judge" ? (
        <Card className="border-primary/20 bg-black/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Judge sign-in
            </CardTitle>
            <CardDescription>
              Select your own name and enter the private access code given to you by the organizer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJudgeSignIn} className="space-y-4">
              <input
                type="text"
                name="username"
                autoComplete="username"
                value={judgeId}
                readOnly
                className="sr-only"
              />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="judge-identity">Judge name</Label>
                  <select
                    id="judge-identity"
                    className="flex h-11 w-full rounded-md border border-white/10 bg-black/60 px-3 py-2 text-white"
                    value={judgeId}
                    onChange={(event) => setJudgeId(event.target.value)}
                    disabled={loadingJudges || !rosterReady || createJudgeSession.isPending}
                    data-testid="select-judge"
                  >
                    <option value="" disabled>-- Choose your name --</option>
                    {judges?.map((judge) => (
                      <option key={judge.id} value={judge.id} disabled={!judge.hasAccessCode}>
                        {judge.name}{judge.hasAccessCode ? "" : " (access code not set)"}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="judge-access-code">Judge access code</Label>
                  <Input
                    id="judge-access-code"
                    type="password"
                    autoComplete="current-password"
                    value={accessCode}
                    onChange={(event) => setAccessCode(event.target.value)}
                    disabled={createJudgeSession.isPending}
                    data-testid="input-judge-access-code"
                  />
                </div>
              </div>
              {authError && (
                <p className="text-sm text-destructive" role="alert" data-testid="text-judge-auth-error">
                  {authError}
                </p>
              )}
              <Button
                type="submit"
                disabled={
                  loadingSession ||
                  !rosterReady ||
                  !judgeId ||
                  accessCode.length < 8 ||
                  createJudgeSession.isPending
                }
                data-testid="button-judge-sign-in"
              >
                {createJudgeSession.isPending ? "Verifying..." : "Sign in to score"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-center justify-between rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3">
          <div>
            <p className="font-semibold text-green-300" data-testid="text-signed-in-judge">
              Signed in as {selectedJudge?.name ?? "judge"}
            </p>
            <p className="text-xs text-white/50">Scores will be recorded only under this identity.</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={deleteSession.isPending}
            onClick={handleJudgeSignOut}
            data-testid="button-judge-sign-out"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="border-primary/20 bg-card overflow-hidden">
          {/* Identity Section */}
          <div className="bg-black/40 p-6 border-b border-white/5 space-y-6">
            <div>
              <div className="space-y-3">
                <Label className="text-white/80 uppercase tracking-wider text-xs font-bold">2. Category</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCategory("group");
                      setSchoolCode("");
                    }}
                    data-testid="button-category-group"
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
                    onClick={() => {
                      setCategory("solo");
                      setSchoolCode("");
                    }}
                    data-testid="button-category-solo"
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
                {SCHOOLS.map((school) => {
                  const alreadyScored = scoredSchoolCodes.has(school.code);
                  return (
                    <button
                      key={school.code}
                      type="button"
                      onClick={() => setSchoolCode(school.code)}
                      disabled={
                        selectedJudgeId == null ||
                        loadingExistingScores ||
                        alreadyScored ||
                        !rosterReady
                      }
                      data-testid={`button-school-${school.code}`}
                      className={`h-16 rounded-lg font-bold text-lg transition-all border ${
                        schoolCode === school.code
                          ? "bg-white text-black border-white shadow-lg scale-105"
                          : alreadyScored
                            ? "bg-green-500/10 text-green-300/70 border-green-500/20 cursor-not-allowed"
                            : "bg-black/40 text-white/70 border-white/10 hover:bg-white/10 hover:border-white/20 disabled:opacity-40 disabled:cursor-not-allowed"
                      }`}
                    >
                      <span className="block">{school.name}</span>
                      {alreadyScored && (
                        <span className="block text-[10px] uppercase tracking-wider">
                          Submitted
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {selectedJudgeId != null && (
                <p className="text-xs text-white/45" data-testid="text-scoring-progress">
                  {scoredSchoolCodes.size}/5 entries scored by you in the {category} category.
                </p>
              )}
            </div>
          </div>

          {/* Scoring Section */}
          <div className="p-6 space-y-6 bg-gradient-to-b from-transparent to-black/20">
            <Label className="text-white/80 uppercase tracking-wider text-xs font-bold flex items-center gap-2">
              4. Enter Scores <Badge variant="outline" className="text-[10px] py-0">Max: 50 / 20 / 30</Badge>
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
                    <div className="text-primary text-sm font-bold mt-1">Max Score: {item.crit.desc}</div>
                  </div>
                  <div className="w-32 relative">
                    <Input
                      type="number"
                      min="0"
                      max={item.crit.max}
                      step="0.1"
                      value={item.state}
                      onChange={(e) => item.setter(e.target.value)}
                      placeholder="0.0"
                      className="text-right text-2xl font-mono h-14 bg-black border-white/20 text-white font-bold"
                      data-testid={`input-score-criterion-${i + 1}`}
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
                      data-testid="input-deduction-count"
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
                  <span data-testid="text-live-total">
                  {totalScore.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

             <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">
             <Button
               type="button"
               variant="outline"
               size="xl"
               className="w-full md:w-auto"
               disabled={selectedJudgeId == null || !schoolCode}
               onClick={() => window.print()}
               data-testid="button-print-score-sheet"
             >
               <Printer className="mr-2 h-5 w-5" />
               Print Score Sheet
             </Button>
             <Button 
              type="submit"
              variant="glow"
              size="xl"
              className="w-full md:w-auto"
              disabled={!isValid || submitScore.isPending}
              data-testid="button-submit-score"
            >
              {submitScore.isPending ? "Submitting..." : "Submit Final Score"}
            </Button>
             </div>
          </CardFooter>
        </Card>
      </form>
      </div>

      <section className="print-score-sheet" aria-label="Printable score sheet">
        <header className="print-score-sheet__header">
          <p className="print-score-sheet__eyebrow">OFFICIAL JUDGING FORM</p>
          <h1>TAGOBTOB: Paindigay nan Majorette ug Twirlers</h1>
          <p className="print-score-sheet__category">
            {category === "group" ? "Group Category" : "Solo / Mother Majorette Category"}
          </p>
        </header>

        <div className="print-score-sheet__details">
          <div>
            <span className="print-score-sheet__label">Judge</span>
            <strong>{selectedJudge?.name ?? "________________________________"}</strong>
          </div>
          <div>
            <span className="print-score-sheet__label">School / Entry</span>
            <strong>
              {selectedSchool ? `${selectedSchool.name} (${selectedSchool.code})` : "________________________________"}
            </strong>
          </div>
          <div>
            <span className="print-score-sheet__label">Category</span>
            <strong>{category === "group" ? "GROUP" : "SOLO (Mother Majorette)"}</strong>
          </div>
        </div>

        <table className="print-score-sheet__criteria">
          <thead>
            <tr>
              <th scope="col">Criteria</th>
              <th scope="col">Weight</th>
              <th scope="col">Judge's Score</th>
            </tr>
          </thead>
          <tbody>
            {criteria.map((criterion) => (
              <tr key={criterion.id}>
                <td>{criterion.label}</td>
                <td>{criterion.max}%</td>
                <td className="print-score-sheet__score-cell">
                  {criterion.id === 1 && c1 ? c1 : criterion.id === 2 && c2 ? c2 : criterion.id === 3 && c3 ? c3 : ""}
                </td>
              </tr>
            ))}
            <tr className="print-score-sheet__total-row">
              <td>Total Score</td>
              <td>100%</td>
              <td>{c1 || c2 || c3 ? totalScore.toFixed(2) : ""}</td>
            </tr>
          </tbody>
        </table>

        <div className="print-score-sheet__violations">
          <strong>Rule violations / deductions:</strong>
          <span>{hasDeduction ? `${deductionCount} violation${deductionCount === "1" ? "" : "s"} (-${parseInt(deductionCount, 10) * 10} points)` : ""}</span>
        </div>
        <div className="print-score-sheet__line" />

        <div className="print-score-sheet__signatures">
          <div>
            <span>Judge's Signature</span>
            <div className="print-score-sheet__signature-line" />
          </div>
          <div>
            <span>Date</span>
            <div className="print-score-sheet__signature-line" />
          </div>
        </div>
      </section>
    </>
  );
}
