import { useEffect, useState } from "react";
import RecentlyStudied from "../components/RecentlyStudied";
import ActiveCourses from "../components/ActiveCourses";
import SuggestedPlan from "../components/SuggestedPlan";
import UpcomingAssignments from "../components/UpcomingAssignments";
import { getFullSnapshot } from "../services/canvasAPI";

export default function Dashboard() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFullSnapshot()
      .then((data) => {
        console.log("grades check:", data.map((c) => ({
          code: c.courseCode,
          grade: c.currentGrade,
          score: c.currentScore,
        })));
        setCourses(data);
      })
      .catch((err) => console.error("Canvas API error:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 overflow-y-auto pt-12 pb-8">
      <div className="flex flex-col items-center">
        <div className="flex flex-col gap-3">
          <h1 className="font-sans text-4xl font-semibold text-text-primary">
            Dashboard
          </h1>

          <div className="flex gap-12">
            {/* Left column */}
            <div className="flex w-[500px] flex-col gap-6">
              <RecentlyStudied courses={courses} />
              <ActiveCourses courses={courses} loading={loading} />
              <UpcomingAssignments courses={courses} loading={loading} />
            </div>

            {/* Right column — AI suggested plan */}
            <SuggestedPlan courses={courses} />
          </div>
        </div>
      </div>
    </div>
  );
}