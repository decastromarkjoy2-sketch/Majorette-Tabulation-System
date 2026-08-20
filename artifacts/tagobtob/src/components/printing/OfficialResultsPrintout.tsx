import { formatTabulationAverage, formatTabulationScore } from "@/lib/score-format";

type OfficialResultEntry = {
  schoolName: string;
  schoolCode: string;
  entryNo: string | number;
  rank: number | null;
  avgCriterion1: number;
  avgCriterion2: number;
  avgCriterion3: number;
  avgDeduction: number;
  avgTotalScore: number;
  prizeAmount?: number | string | null;
};

type OfficialResultsPrintoutProps = {
  category: string;
  entries: OfficialResultEntry[];
  provisionalCount: number;
};

const formatPrize = (amount?: number | string | null) => {
  if (amount == null || amount === "") return "—";
  if (typeof amount === "string") return amount.startsWith("₱") ? amount : `₱${amount}`;
  return `₱${amount.toLocaleString("en-PH")}`;
};

export function OfficialResultsPrintout({
  category,
  entries,
  provisionalCount,
}: OfficialResultsPrintoutProps) {
  return (
    <section className="print-official-results" aria-hidden="true">
      <header className="print-official-results__header">
        <p className="print-official-results__eyebrow">OFFICIAL COMPETITION RESULTS</p>
        <h1>TAGOBTOB: Paindigay nan Majorette ug Twirlers</h1>
        <h2>{category}</h2>
        <p>Official results based on the three-judge average, deductions, and approved tie-break policy.</p>
      </header>

      <section className="print-official-results__awardees" aria-label="Official awardees">
        <h3>Official Awardees</h3>
        {entries.length > 0 ? (
          <div className="print-official-results__awardee-grid">
            {entries.map((entry) => (
              <div className="print-official-results__awardee" key={entry.schoolCode}>
                <span className="print-official-results__awardee-rank">
                  {entry.rank}
                  {entry.rank === 1 ? "ST" : entry.rank === 2 ? "ND" : entry.rank === 3 ? "RD" : "TH"} PLACE
                </span>
                <strong>{entry.schoolName}</strong>
                <span>Final Score: {formatTabulationScore(entry.avgTotalScore)}</span>
                <span>Prize: {formatPrize(entry.prizeAmount)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="print-official-results__empty">No official awardees are available until all entries receive three judge scores.</p>
        )}
      </section>

      <section className="print-official-results__rankings" aria-label="Ranked results">
        <div className="print-official-results__section-heading">
          <h3>Ranked Results</h3>
          {provisionalCount > 0 && (
            <p>{provisionalCount} provisional {provisionalCount === 1 ? "entry" : "entries"} omitted from official rankings.</p>
          )}
        </div>
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>School / Entry</th>
              <th>Avg Crit 1<br />(50 pts)</th>
              <th>Avg Crit 2<br />(20 pts)</th>
              <th>Avg Crit 3<br />(30 pts)</th>
              <th>Avg Ded.<br />(-10)</th>
              <th>Final Score</th>
              <th>Cash Prize</th>
            </tr>
          </thead>
          <tbody>
            {entries.length > 0 ? (
              entries.map((entry) => (
                <tr key={`${entry.schoolCode}-${entry.entryNo}`}>
                  <td>{entry.rank}</td>
                  <td>
                    <strong>{entry.schoolName}</strong>
                    <small>Code: {entry.schoolCode} · Entry: {entry.entryNo}</small>
                  </td>
                  <td>{formatTabulationAverage(entry.avgCriterion1)}</td>
                  <td>{formatTabulationAverage(entry.avgCriterion2)}</td>
                  <td>{formatTabulationAverage(entry.avgCriterion3)}</td>
                  <td>{formatTabulationAverage(entry.avgDeduction)}</td>
                  <td><strong>{formatTabulationScore(entry.avgTotalScore)}</strong></td>
                  <td>{formatPrize(entry.prizeAmount)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8}>No official ranked results are available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <footer className="print-official-results__signatures">
        <h3>Board of Judges</h3>
        <div className="print-official-results__signature-grid">
          {[1, 2, 3].map((judgeNumber) => (
            <div className="print-official-results__signature" key={judgeNumber}>
              <span />
              <strong>Judge {judgeNumber}</strong>
              <small>Signature over printed name</small>
            </div>
          ))}
        </div>
      </footer>
    </section>
  );
}