import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarGroupProps {
  members: string[];
  max?: number;
  className?: string;
}

export function UserAvatarGroup({
  members,
  max = 3,
  className,
}: UserAvatarGroupProps) {
  const visible = members.slice(0, max);
  const remaining = members.length - max;

  return (
    <div className={cn("flex -space-x-2", className)} aria-label={`${members.length} team members`}>
      {visible.map((initials) => (
        <Avatar
          key={initials}
          className="h-7 w-7 border-2 border-card text-[10px] font-medium"
        >
          <AvatarFallback className="bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
      ))}
      {remaining > 0 ? (
        <Avatar className="h-7 w-7 border-2 border-card text-[10px] font-medium">
          <AvatarFallback className="bg-muted text-muted-foreground">
            +{remaining}
          </AvatarFallback>
        </Avatar>
      ) : null}
    </div>
  );
}
