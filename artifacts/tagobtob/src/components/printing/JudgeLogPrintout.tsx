type JudgeLogScore = {
  id: number;
  createdAt: string;
  category: string;
  schoolName: string;
  schoolCode: string;
  entryNo: string;
  rawCriterion1: number;
  rawCriterion2: number;
  rawCriterion3: number;
  deductionCount: number;
  totalScore: number;
};

type JudgeLogPrintoutProps = {
  judgeName: string;
  scores: JudgeLogScore[];
  active: boolean;
};

export function JudgeLogPrintout({ judgeName, scores, active }: JudgeLogPrintoutProps) {
  return (
    <section className={`print-judge-log${active ? " print-judge-log--active" : ""}`} aria-hidden="true">
      <header className="print-judge-log__header">
        <p className="print-judge-log__eyebrow">OFFICIAL SCORECARD HISTORY</p>
          <h1>TAGOBTOB: Indigay nan mga Majorette sanan mga Twirlers</h1>
        <h2>Judge Log: {judgeName}</h2>
        <p>Submitted scores recorded under the server-controlled judge session.</p>
      </header>

      <div className="print-judge-log__summary">
        <span><strong>Judge:</strong> {judgeName}</span>
        <span><strong>Total scorecards:</strong> {scores.length}</span>
      </div>

      <table>
        <thead>
          <tr>
            <th>Date / Time</th>
            <th>Category</th>
            <th>School / Entry</th>
            <th>C1<br />(50)</th>
            <th>C2<br />(20)</th>
            <th>C3<br />(30)</th>
            <th>Ded.</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((score) => (
            <tr key={score.id}>
              <td>{new Date(score.createdAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "medium" })}</td>
              <td>{score.category === "group" ? "Group" : "Solo"}</td>
              <td>
                <strong>{score.schoolName}</strong>
                <small>Code: {score.schoolCode} · Entry: {score.entryNo}</small>
              </td>
              <td>{score.rawCriterion1.toFixed(2)}</td>
              <td>{score.rawCriterion2.toFixed(2)}</td>
              <td>{score.rawCriterion3.toFixed(2)}</td>
              <td>{score.deductionCount > 0 ? `-${score.deductionCount * 10}` : "0"}</td>
              <td><strong>{score.totalScore.toFixed(2)}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>

      <footer className="print-judge-log__signature">
        <span />
        <strong>{judgeName}</strong>
        <small>Judge signature over printed name</small>
      </footer>
    </section>
  );
}