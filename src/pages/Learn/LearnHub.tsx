import { useState } from "react";

interface Lesson {
  id: number;
  title: string;
  subtitle: string;
  duration: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  category: string;
  icon: string;
  done: boolean;
  locked: boolean;
  content: LessonSection[];
}

interface LessonSection {
  type: "text" | "code" | "tip" | "quiz";
  content: string;
  language?: string;
  question?: string;
  options?: string[];
  correct?: number;
}

const LESSONS: Lesson[] = [
  {
    id: 1,
    title: "What is data analysis?",
    subtitle: "Understand the big picture before writing a single line of code",
    duration: "5 min",
    difficulty: "Beginner",
    category: "Foundations",
    icon: "🔍",
    done: true,
    locked: false,
    content: [
      { type: "text", content: "Data analysis is the process of inspecting, cleaning, transforming, and modeling data to discover useful information, draw conclusions, and support decision-making.\n\nThink of it like detective work — you start with a question, gather clues (data), and piece them together to find an answer." },
      { type: "tip", content: "The most important step in any analysis is clearly defining the question you're trying to answer. A vague question leads to a vague (and useless) answer." },
      { type: "text", content: "The data analysis pipeline has 6 stages:\n\n**Define** → What question are you answering?\n**Collect** → Where does the data come from?\n**Clean** → Is the data trustworthy?\n**Analyze** → What patterns exist?\n**Visualize** → How do you show those patterns?\n**Report** → How do you communicate your findings?" },
      { type: "quiz", content: "", question: "Which step comes first in a good data analysis?", options: ["Collect data", "Define the question", "Build charts", "Write the report"], correct: 1 },
    ],
  },
  {
    id: 2,
    title: "Your first SQL query",
    subtitle: "SELECT, FROM, WHERE — with live practice examples",
    duration: "8 min",
    difficulty: "Beginner",
    category: "SQL",
    icon: "🗄️",
    done: false,
    locked: false,
    content: [
      { type: "text", content: "SQL (Structured Query Language) is the language used to talk to databases. It's remarkably readable — it's almost like writing a sentence in English.\n\nHere's the most basic SQL query:" },
      { type: "code", content: "SELECT *\nFROM customers;", language: "sql" },
      { type: "text", content: "This says: **\"Give me everything (*) from the customers table.\"**\n\nYou can pick specific columns instead of everything:" },
      { type: "code", content: "SELECT name, email, city\nFROM customers;", language: "sql" },
      { type: "text", content: "To filter rows, use WHERE:" },
      { type: "code", content: "SELECT name, email\nFROM customers\nWHERE city = 'Kampala';", language: "sql" },
      { type: "tip", content: "SQL keywords (SELECT, FROM, WHERE) are usually written in capitals by convention, but they work in lowercase too. The important thing is consistency." },
      { type: "quiz", content: "", question: "Which keyword filters rows in SQL?", options: ["SELECT", "FROM", "WHERE", "TABLE"], correct: 2 },
    ],
  },
  {
    id: 3,
    title: "Cleaning messy data",
    subtitle: "Nulls, duplicates, and formatting issues — what to do with each",
    duration: "10 min",
    difficulty: "Beginner",
    category: "Data Cleaning",
    icon: "🧹",
    done: false,
    locked: false,
    content: [
      { type: "text", content: "Real-world data is almost always messy. Before you can trust your analysis, you need to clean the data. The most common issues are:\n\n**Null values** — missing data (shown as NULL, N/A, or blank)\n**Duplicates** — the same record appears more than once\n**Type errors** — a number stored as text, a date in the wrong format\n**Outliers** — values that are suspiciously high or low" },
      { type: "tip", content: "The DataFlow Clean tab automatically scans your data and flags all of these issues — you don't have to find them manually." },
      { type: "text", content: "When you find a null value, you have three choices:\n\n1. **Remove the row** — if nulls are rare and the row isn't critical\n2. **Fill with a default** — e.g. 0 for numbers, 'Unknown' for text\n3. **Keep it** — if the null itself is informative (e.g. 'no response')" },
      { type: "code", content: "-- In SQL, fill nulls with a default value\nSELECT\n  name,\n  COALESCE(city, 'Unknown') AS city\nFROM customers;", language: "sql" },
      { type: "quiz", content: "", question: "You have a 'revenue' column with 5 out of 10,000 rows missing. What's the best approach?", options: ["Delete the whole column", "Fill with the average revenue", "Delete those 5 rows", "Either B or C depending on context"], correct: 3 },
    ],
  },
  {
    id: 4,
    title: "Reading a chart",
    subtitle: "Bar, line, scatter, pie — when to use which type",
    duration: "7 min",
    difficulty: "Beginner",
    category: "Visualization",
    icon: "📊",
    done: false,
    locked: false,
    content: [
      { type: "text", content: "The chart type you choose changes how people understand your data. Each type tells a different kind of story." },
      { type: "text", content: "**Bar chart** — Compare categories against each other\nExample: Sales by region, Signups by month\n\n**Line chart** — Show trends over time\nExample: Revenue growth, User activity over weeks\n\n**Pie chart** — Show parts of a whole (use sparingly — max 5 slices)\nExample: Market share breakdown\n\n**Scatter plot** — Show correlation between two numbers\nExample: Age vs. income, Hours studied vs. test score\n\n**Heatmap** — Show intensity across a grid\nExample: Sales by hour and day of week" },
      { type: "tip", content: "When in doubt, use a bar chart. It's the most universally understood chart type and works for almost any comparison." },
      { type: "quiz", content: "", question: "You want to show how your website traffic changed each day over the past 3 months. What chart type should you use?", options: ["Pie chart", "Scatter plot", "Line chart", "Heatmap"], correct: 2 },
    ],
  },
  {
    id: 5,
    title: "Writing a data story",
    subtitle: "Turn numbers into insights your audience actually understands",
    duration: "9 min",
    difficulty: "Beginner",
    category: "Reporting",
    icon: "✍️",
    done: false,
    locked: false,
    content: [
      { type: "text", content: "Data analysis is only valuable if you can communicate your findings to others. A data story has three parts:\n\n**Context** — What was the question? Why does it matter?\n**Findings** — What did the data reveal? (be specific: use numbers)\n**So what?** — What action should someone take based on this?" },
      { type: "tip", content: "Lead with the conclusion, not the journey. Most people reading your report want to know the answer first — then they'll read the details." },
      { type: "text", content: "**Example of a weak finding:**\n*\"We analyzed the data and found some interesting patterns in customer behavior.\"*\n\n**Example of a strong finding:**\n*\"Customers who make a purchase within 48 hours of signing up have 3× higher lifetime value. We should prioritize onboarding speed.\"*" },
      { type: "quiz", content: "", question: "What is the most important thing to lead with in a data report?", options: ["Your methodology", "Your conclusion", "Your data sources", "Your chart legends"], correct: 1 },
    ],
  },
  {
    id: 6,
    title: "GROUP BY and aggregations",
    subtitle: "Count, sum, and average — the bread and butter of SQL analysis",
    duration: "12 min",
    difficulty: "Intermediate",
    category: "SQL",
    icon: "🔢",
    done: false,
    locked: false,
    content: [
      { type: "text", content: "GROUP BY is one of the most powerful SQL concepts. It lets you calculate summary statistics for groups of rows rather than individual rows." },
      { type: "code", content: "-- How many customers do we have per city?\nSELECT\n  city,\n  COUNT(*) AS customer_count\nFROM customers\nGROUP BY city\nORDER BY customer_count DESC;", language: "sql" },
      { type: "text", content: "Common aggregate functions:\n\n`COUNT(*)` — count rows\n`SUM(column)` — total of a number column\n`AVG(column)` — average value\n`MIN(column)` — lowest value\n`MAX(column)` — highest value" },
      { type: "code", content: "-- Revenue summary by product category\nSELECT\n  category,\n  COUNT(*) AS orders,\n  SUM(revenue) AS total_revenue,\n  AVG(revenue) AS avg_order_value\nFROM orders\nGROUP BY category;", language: "sql" },
      { type: "tip", content: "Every column in your SELECT that isn't an aggregate function must appear in your GROUP BY clause." },
      { type: "quiz", content: "", question: "Which SQL function counts the number of rows in each group?", options: ["SUM(*)", "COUNT(*)", "AVG(*)", "TOTAL(*)"], correct: 1 },
    ],
  },
  {
    id: 7,
    title: "Pandas basics for data analysis",
    subtitle: "Load, explore, and filter data with Python's most popular library",
    duration: "15 min",
    difficulty: "Intermediate",
    category: "Python",
    icon: "🐍",
    done: false,
    locked: true,
    content: [
      { type: "text", content: "Pandas is Python's go-to library for working with tabular data. Think of it as Excel — but programmable and capable of handling millions of rows.\n\nStart by importing and loading your data:" },
      { type: "code", content: "import pandas as pd\n\n# Load a CSV file\ndf = pd.read_csv('sales.csv')\n\n# First look at the data\ndf.head()        # first 5 rows\ndf.info()        # column types + null counts\ndf.describe()    # summary statistics", language: "python" },
      { type: "text", content: "Filtering rows works like this:" },
      { type: "code", content: "# All rows where city is Kampala\ndf_kampala = df[df['city'] == 'Kampala']\n\n# Multiple conditions\ndf_filtered = df[(df['revenue'] > 100) & (df['status'] == 'complete')]", language: "python" },
    ],
  },
];

const CATEGORIES = ["All", "Foundations", "SQL", "Data Cleaning", "Visualization", "Python", "Reporting"];

export default function LearnHub() {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterLevel, setFilterLevel] = useState<string>("All");
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<Record<number, boolean>>({});

  const completedCount = LESSONS.filter((l) => l.done).length;
  const progressPct = Math.round((completedCount / LESSONS.length) * 100);

  const filtered = LESSONS.filter((l) => {
    if (filterCategory !== "All" && l.category !== filterCategory) return false;
    if (filterLevel !== "All" && l.difficulty !== filterLevel) return false;
    return true;
  });

  if (selectedLesson) {
    return (
      <LessonViewer
        lesson={selectedLesson}
        quizAnswers={quizAnswers}
        quizSubmitted={quizSubmitted}
        onSelectAnswer={(qi, ai) => setQuizAnswers((p) => ({ ...p, [qi]: ai }))}
        onSubmitQuiz={(qi) => setQuizSubmitted((p) => ({ ...p, [qi]: true }))}
        onBack={() => setSelectedLesson(null)}
      />
    );
  }

  return (
    <div style={{ height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{
        padding: "20px 24px 16px",
        borderBottom: "0.5px solid #e8e6e0",
        background: "white",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>Learning Hub</h1>
            <p style={{ fontSize: 12.5, color: "#73726c", margin: 0 }}>
              Follow the path or jump to any topic. Lessons use real analysis concepts with practical examples.
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--brand)" }}>{completedCount}/{LESSONS.length}</div>
            <div style={{ fontSize: 11, color: "#73726c" }}>lessons complete</div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 14 }}>
          <div style={{
            height: 6, background: "#f0ede8", borderRadius: 3,
            overflow: "hidden",
          }}>
            <div style={{
              height: "100%", borderRadius: 3,
              width: `${progressPct}%`,
              background: "linear-gradient(90deg, #534AB7, #7C6FE0)",
              transition: "width 0.5s ease",
            }} />
          </div>
          <div style={{ fontSize: 11, color: "#73726c", marginTop: 5 }}>
            {progressPct}% complete · {LESSONS.length - completedCount} lessons remaining
          </div>
        </div>

        {/* Filters */}
        <div style={{ marginTop: 14, display: "flex", gap: 20 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setFilterCategory(c)}
                style={{
                  padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500,
                  border: filterCategory === c ? "none" : "0.5px solid #d0cec6",
                  background: filterCategory === c ? "var(--brand)" : "white",
                  color: filterCategory === c ? "white" : "#73726c",
                  cursor: "pointer", transition: "all 0.12s",
                }}
              >{c}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, marginLeft: "auto", flexShrink: 0 }}>
            {["All", "Beginner", "Intermediate", "Advanced"].map((l) => (
              <button
                key={l}
                onClick={() => setFilterLevel(l)}
                style={{
                  padding: "4px 10px", borderRadius: 20, fontSize: 11,
                  border: filterLevel === l ? "none" : "0.5px solid #d0cec6",
                  background: filterLevel === l ? "#f0ede8" : "white",
                  color: filterLevel === l ? "#1a1a18" : "#73726c",
                  cursor: "pointer", transition: "all 0.12s", fontWeight: filterLevel === l ? 500 : 400,
                }}
              >{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Lesson grid */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 12,
        }}>
          {filtered.map((lesson, idx) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              index={idx}
              onClick={() => !lesson.locked && setSelectedLesson(lesson)}
            />
          ))}
        </div>

        {/* Community links */}
        <div style={{
          marginTop: 24, padding: "16px 18px",
          background: "white", borderRadius: 12,
          border: "0.5px solid #e8e6e0",
          display: "flex", gap: 24, alignItems: "center",
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>Want more learning resources?</div>
            <div style={{ fontSize: 12, color: "#73726c" }}>Join the community forum to ask questions, share projects, and find peer mentors.</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            {[
              { icon: "🌐", label: "Forum" },
              { icon: "💬", label: "Support" },
              { icon: "📚", label: "Docs" },
            ].map((l) => (
              <button
                key={l.label}
                style={{
                  padding: "7px 14px", borderRadius: 8, fontSize: 12,
                  border: "0.5px solid #e8e6e0", background: "white",
                  color: "#3d3d3a", cursor: "pointer", fontWeight: 500,
                  display: "flex", alignItems: "center", gap: 5,
                  transition: "all 0.12s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--brand-border)";
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--brand-light)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--brand)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#e8e6e0";
                  (e.currentTarget as HTMLButtonElement).style.background = "white";
                  (e.currentTarget as HTMLButtonElement).style.color = "#3d3d3a";
                }}
              >
                <span>{l.icon}</span> {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LessonCard({ lesson, index, onClick }: { lesson: Lesson; index: number; onClick: () => void }) {
  const diffColor: Record<string, string> = {
    Beginner: "var(--teal)",
    Intermediate: "var(--amber)",
    Advanced: "var(--danger)",
  };
  const diffBg: Record<string, string> = {
    Beginner: "var(--teal-light)",
    Intermediate: "var(--amber-light)",
    Advanced: "var(--danger-light)",
  };

  return (
    <div
      onClick={onClick}
      style={{
        background: "white",
        border: lesson.done ? "0.5px solid #A5D9C5" : "0.5px solid #e8e6e0",
        borderRadius: 12,
        padding: 16,
        cursor: lesson.locked ? "not-allowed" : "pointer",
        transition: "all 0.15s",
        opacity: lesson.locked ? 0.55 : 1,
        position: "relative",
        overflow: "hidden",
        animation: `fadeUp 0.3s ease ${index * 0.04}s both`,
      }}
      onMouseEnter={(e) => {
        if (!lesson.locked) {
          (e.currentTarget as HTMLDivElement).style.borderColor = lesson.done ? "#1D9E75" : "var(--brand-border)";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 14px rgba(83,74,183,0.1)";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = lesson.done ? "#A5D9C5" : "#e8e6e0";
        (e.currentTarget as HTMLDivElement).style.transform = "none";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      {lesson.done && (
        <div style={{
          position: "absolute", top: 0, right: 0,
          background: "var(--teal)", color: "white",
          fontSize: 10, fontWeight: 600, padding: "3px 8px",
          borderBottomLeftRadius: 8,
        }}>✓ DONE</div>
      )}
      {lesson.locked && (
        <div style={{
          position: "absolute", top: 0, right: 0,
          background: "#f0ede8", color: "#b0aea6",
          fontSize: 10, fontWeight: 600, padding: "3px 8px",
          borderBottomLeftRadius: 8,
        }}>🔒 LOCKED</div>
      )}

      <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: lesson.done ? "var(--teal-light)" : "var(--brand-light)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, flexShrink: 0,
        }}>
          {lesson.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2, lineHeight: 1.3 }}>{lesson.title}</div>
          <div style={{ fontSize: 10, color: "#b0aea6" }}>{lesson.category}</div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: "#73726c", lineHeight: 1.5, marginBottom: 12 }}>
        {lesson.subtitle}
      </div>

      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
          background: diffBg[lesson.difficulty], color: diffColor[lesson.difficulty],
        }}>{lesson.difficulty}</span>
        <span style={{ fontSize: 11, color: "#b0aea6" }}>· {lesson.duration}</span>
        {!lesson.locked && !lesson.done && (
          <span style={{
            marginLeft: "auto", fontSize: 11, color: "var(--brand)", fontWeight: 500,
          }}>Start →</span>
        )}
        {lesson.done && (
          <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--teal)", fontWeight: 500 }}>
            Review →
          </span>
        )}
      </div>
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }`}</style>
    </div>
  );
}

function LessonViewer({
  lesson,
  quizAnswers,
  quizSubmitted,
  onSelectAnswer,
  onSubmitQuiz,
  onBack,
}: {
  lesson: Lesson;
  quizAnswers: Record<number, number>;
  quizSubmitted: Record<number, boolean>;
  onSelectAnswer: (qi: number, ai: number) => void;
  onSubmitQuiz: (qi: number) => void;
  onBack: () => void;
}) {
  let quizIndex = 0;

  return (
    <div style={{ height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Lesson topbar */}
      <div style={{
        padding: "12px 24px", borderBottom: "0.5px solid #e8e6e0",
        background: "white", display: "flex", alignItems: "center",
        gap: 14, flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          className="btn btn-secondary"
          style={{ fontSize: 12, padding: "6px 12px" }}
        >
          ← Back
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "var(--brand-light)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
          }}>{lesson.icon}</div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{lesson.title}</div>
            <div style={{ fontSize: 11, color: "#73726c" }}>{lesson.category} · {lesson.duration} · {lesson.difficulty}</div>
          </div>
        </div>
        {lesson.done && <span className="pill pill-teal">✓ Completed</span>}
      </div>

      {/* Lesson content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 24px", maxWidth: 680 }}>
        {lesson.content.map((section, i) => {
          if (section.type === "text") {
            return (
              <div key={i} style={{ fontSize: 13.5, lineHeight: 1.8, marginBottom: 20, color: "#1a1a18" }}>
                {section.content.split("\n").map((line, li) => {
                  if (line === "") return <div key={li} style={{ height: 8 }} />;
                  // Handle bold
                  const parts: React.ReactNode[] = [];
                  const re = /\*\*(.+?)\*\*/g;
                  let last = 0; let match; let k = 0;
                  while ((match = re.exec(line)) !== null) {
                    if (match.index > last) parts.push(line.slice(last, match.index));
                    parts.push(<strong key={k++}>{match[1]}</strong>);
                    last = match.index + match[0].length;
                  }
                  if (last < line.length) parts.push(line.slice(last));
                  return <div key={li}>{parts.length > 0 ? parts : line}</div>;
                })}
              </div>
            );
          }

          if (section.type === "code") {
            return (
              <div key={i} style={{ marginBottom: 20 }}>
                <div style={{
                  background: "#1e1e2e",
                  borderRadius: 10,
                  overflow: "hidden",
                  border: "0.5px solid #2d2d3d",
                }}>
                  <div style={{
                    padding: "8px 14px", background: "#16161f",
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <div style={{ display: "flex", gap: 5 }}>
                      {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
                        <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 11, color: "#636380", marginLeft: 6, fontFamily: "monospace", textTransform: "uppercase" }}>
                      {section.language}
                    </span>
                  </div>
                  <pre style={{
                    margin: 0, padding: "14px 16px",
                    fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
                    fontSize: 12.5, lineHeight: 1.7,
                    color: "#CDD6F4", overflowX: "auto",
                    whiteSpace: "pre-wrap", wordBreak: "break-word",
                  }}>
                    {section.content}
                  </pre>
                </div>
              </div>
            );
          }

          if (section.type === "tip") {
            return (
              <div key={i} style={{
                marginBottom: 20, padding: "12px 16px",
                background: "var(--brand-light)",
                border: "0.5px solid var(--brand-border)",
                borderRadius: 10,
                display: "flex", gap: 12,
              }}>
                <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.4 }}>💡</span>
                <div style={{ fontSize: 13, lineHeight: 1.65, color: "#2d2870" }}>
                  <strong>Tip: </strong>{section.content}
                </div>
              </div>
            );
          }

          if (section.type === "quiz") {
            const qi = quizIndex++;
            const answered = quizAnswers[qi] !== undefined;
            const submitted = quizSubmitted[qi];
            const isCorrect = answered && quizAnswers[qi] === section.correct;

            return (
              <div key={i} style={{
                marginBottom: 24, padding: 18,
                background: submitted
                  ? (isCorrect ? "var(--teal-light)" : "#FCEBEB")
                  : "#f8f7f5",
                border: `0.5px solid ${submitted ? (isCorrect ? "#A5D9C5" : "#F0ABAB") : "#e8e6e0"}`,
                borderRadius: 12,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{
                    background: "var(--brand)", color: "white",
                    width: 22, height: 22, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, flexShrink: 0, marginTop: 1,
                  }}>?</span>
                  {section.question}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {section.options?.map((opt, oi) => {
                    const isSelected = quizAnswers[qi] === oi;
                    const isRight = oi === section.correct;
                    let bg = "white";
                    let border = "#d0cec6";
                    let color = "#1a1a18";
                    if (submitted) {
                      if (isRight) { bg = "var(--teal-light)"; border = "#1D9E75"; color = "#085041"; }
                      else if (isSelected && !isRight) { bg = "var(--danger-light)"; border = "var(--danger)"; color = "#791F1F"; }
                    } else if (isSelected) {
                      bg = "var(--brand-light)"; border = "var(--brand)"; color = "var(--brand)";
                    }

                    return (
                      <button
                        key={oi}
                        onClick={() => !submitted && onSelectAnswer(qi, oi)}
                        style={{
                          textAlign: "left", padding: "9px 12px",
                          borderRadius: 8, border: `1.5px solid ${border}`,
                          background: bg, color, fontSize: 12.5,
                          cursor: submitted ? "default" : "pointer",
                          transition: "all 0.12s", fontWeight: isSelected || (submitted && isRight) ? 500 : 400,
                          display: "flex", alignItems: "center", gap: 8,
                        }}
                      >
                        <span style={{
                          width: 20, height: 20, borderRadius: "50%",
                          border: `1.5px solid ${border}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, flexShrink: 0, fontWeight: 700,
                          background: isSelected ? "var(--brand)" : submitted && isRight ? "var(--teal)" : "transparent",
                          color: isSelected || (submitted && isRight) ? "white" : color,
                        }}>
                          {submitted && isRight ? "✓" : submitted && isSelected && !isRight ? "✗" : String.fromCharCode(65 + oi)}
                        </span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {!submitted && answered && (
                  <button
                    className="btn btn-primary"
                    onClick={() => onSubmitQuiz(qi)}
                    style={{ marginTop: 12, fontSize: 12 }}
                  >
                    Check answer
                  </button>
                )}
                {submitted && (
                  <div style={{ marginTop: 12, fontSize: 12.5, fontWeight: 500, color: isCorrect ? "#085041" : "#791F1F" }}>
                    {isCorrect ? "✓ Correct! Well done." : `✗ Not quite — the correct answer is: ${section.options?.[section.correct ?? 0]}`}
                  </div>
                )}
              </div>
            );
          }

          return null;
        })}

        {/* Navigation */}
        <div style={{
          marginTop: 32, display: "flex", justifyContent: "space-between",
          padding: "16px 0", borderTop: "0.5px solid #e8e6e0",
        }}>
          <button className="btn btn-secondary" onClick={onBack} style={{ fontSize: 12 }}>
            ← Back to lessons
          </button>
          <button className="btn btn-primary" onClick={onBack} style={{ fontSize: 12 }}>
            Mark complete & continue →
          </button>
        </div>
      </div>
    </div>
  );
}
