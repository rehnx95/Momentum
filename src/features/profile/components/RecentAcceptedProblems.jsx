export default function RecentAcceptedProblems({ problems }) {
  return (
    <section className="recent-ac-card surface-card" aria-labelledby="recent-ac-heading">
      <div className="recent-ac-heading">
        <div>
          <h2 id="recent-ac-heading">Recent AC</h2>
          <p>Your latest accepted problems</p>
        </div>
        <span className="recent-ac-count">Latest {problems.length}</span>
      </div>
      {problems.length > 0 ? (
        <>
          <div className="recent-ac-columns" aria-hidden="true">
            <span />
            <span>Problem</span>
            <span>Sheet</span>
            <span>Date</span>
          </div>
          <ul className="recent-ac-list">
            {problems.map((problem) => (
              <li key={problem.id} className="recent-ac-item">
                <div className="recent-ac-check" aria-hidden="true">
                  ✓
                </div>
                <p className="recent-ac-title recent-ac-problem">{problem.title}</p>
                <span className="recent-ac-topic recent-ac-sheet">
                  {problem.sheetTitle}
                </span>
                {problem.acceptedOn ? (
                  <time className="recent-ac-date" dateTime={problem.acceptedOn}>
                    {new Date(`${problem.acceptedOn}T00:00:00`).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                ) : (
                  <span className="recent-ac-date">Date unavailable</span>
                )}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="recent-ac-empty">Accepted problems will show here as you solve them.</p>
      )}
    </section>
  );
}
