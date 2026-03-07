import RecentlyStudied from "../components/RecentlyStudied";
import ActiveCourses from "../components/ActiveCourses";
import SuggestedPlan from "../components/SuggestedPlan";

export default function Dashboard() {
  return (
    <div className="flex-1 overflow-hidden pt-12">
      <div className="flex flex-col items-center">
        <div className="flex flex-col gap-3">
          <h1 className="font-sans text-4xl font-semibold text-text-primary">
            Dashboard
          </h1>

          <div className="flex gap-12">
            <div className="flex w-[500px] flex-col gap-6">
              <RecentlyStudied />
              <ActiveCourses />
            </div>

            <SuggestedPlan />
          </div>
        </div>
      </div>
    </div>
  );
}
