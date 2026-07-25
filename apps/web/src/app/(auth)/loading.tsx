import { LoadingState } from "@/components/common/feedback/loading-state";

export default function AuthLoading() {
  return (
    <LoadingState
      label="Loading"
      className="min-h-[320px] border-0 bg-transparent"
    />
  );
}
