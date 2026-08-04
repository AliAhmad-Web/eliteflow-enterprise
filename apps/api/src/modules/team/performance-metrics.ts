import { prisma, type AttendanceStatus } from "@enterprise/database";

export type PerformanceMetricCatalog = {
  attendancePresentDays: number;
  attendanceLateDays: number;
  attendanceAbsentDays: number;
  leaveDays: number;
  workingMinutes: number;
  overtimeMinutes: number;
  loginDays: number;
  logoutEvents: number;
  avgSessionMinutes: number;
  tasksAssigned: number;
  tasksCompleted: number;
  tasksPending: number;
  tasksOverdue: number;
  deadlineAccuracy: number;
  projectsJoined: number;
  projectTasksCompleted: number;
  teamMemberships: number;
  meetingsAttended: number;
  calendarEvents: number;
  messagesSent: number;
  threadReplies: number;
  aiConversations: number;
  aiDocuments: number;
  documentsCreated: number;
  filesUploaded: number;
  fileUpdates: number;
  reportsSubmitted: number;
  clientLinkedFiles: number;
  goalsCompleted: number;
  goalsAvgProgress: number;
  kpiCompletionRate: number;
  activityEvents: number;
  promotionsCount: number;
  securityWarnings: number;
  skillsCount: number;
};

export type PerformanceScoreBreakdown = {
  attendance: number;
  productivity: number;
  discipline: number;
  collaboration: number;
  leadership: number;
  quality: number;
  communication: number;
  innovation: number;
  engagement: number;
  consistency: number;
};

export type PerformancePredictions = {
  burnoutRisk: number;
  attritionRisk: number;
  engagementScore: number;
  consistencyScore: number;
};

export type PerformanceRecommendations = {
  promotionReady: boolean;
  salaryReviewSuggested: boolean;
  bonusSuggested: boolean;
  trainingPrograms: string[];
  managerReviewNeeded: boolean;
};

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function dateOnlyIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Collects the full 360° activity catalog for one employee over a period.
 */
export async function collectPerformanceMetrics(
  employeeId: string,
  userId: string,
  periodStart: Date,
  periodEnd: Date,
  options?: { isManager?: boolean },
): Promise<{
  metrics: PerformanceMetricCatalog;
  breakdown: PerformanceScoreBreakdown;
  predictions: PerformancePredictions;
  recommendations: PerformanceRecommendations;
}> {
  const isManager = options?.isManager ?? false;

  const [
    attendanceRows,
    leaveCount,
    tasks,
    projectMemberships,
    teamMemberships,
    meetingCount,
    calendarCount,
    messageCount,
    discussionReplies,
    aiConversations,
    aiDocuments,
    filesCreated,
    fileUpdates,
    clientFiles,
    activityCount,
    sessions,
    goals,
    promotions,
    securityEvents,
    employee,
    reportsCount,
    managedTeamSize,
  ] = await Promise.all([
    prisma.attendance.findMany({
      where: { employeeId, date: { gte: periodStart, lte: periodEnd } },
      select: {
        status: true,
        isLate: true,
        workingMinutes: true,
        overtimeMinutes: true,
        checkOutAt: true,
      },
    }),
    prisma.leaveRequest.count({
      where: {
        employeeId,
        status: "APPROVED",
        startDate: { lte: periodEnd },
        endDate: { gte: periodStart },
      },
    }),
    prisma.task.findMany({
      where: {
        assignedToId: userId,
        deletedAt: null,
        OR: [
          { createdAt: { gte: periodStart, lte: periodEnd } },
          { updatedAt: { gte: periodStart, lte: periodEnd } },
          { dueDate: { gte: periodStart, lte: periodEnd } },
        ],
      },
      select: {
        status: true,
        dueDate: true,
        progress: true,
        projectId: true,
        updatedAt: true,
      },
    }),
    prisma.projectMember.count({ where: { userId } }),
    prisma.teamMember.count({ where: { userId } }),
    prisma.meetingParticipant.count({
      where: {
        userId,
        OR: [
          { joinedAt: { gte: periodStart, lte: periodEnd } },
          { admittedAt: { gte: periodStart, lte: periodEnd } },
        ],
      },
    }),
    prisma.eventAttendee.count({
      where: {
        userId,
        event: {
          startsAt: { gte: periodStart, lte: periodEnd },
          deletedAt: null,
        },
      },
    }),
    prisma.message.count({
      where: {
        senderId: userId,
        deletedAt: null,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    }),
    prisma.discussionReply.count({
      where: {
        authorId: userId,
        deletedAt: null,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    }),
    prisma.aiConversation.count({
      where: {
        userId,
        deletedAt: null,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    }),
    prisma.aiDocument.count({
      where: {
        userId,
        deletedAt: null,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    }),
    prisma.managedFile.count({
      where: {
        createdById: userId,
        deletedAt: null,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    }),
    prisma.fileActivity.count({
      where: {
        actorId: userId,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    }),
    prisma.managedFile.count({
      where: {
        createdById: userId,
        clientId: { not: null },
        deletedAt: null,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    }),
    prisma.activity.count({
      where: {
        actorId: userId,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    }),
    prisma.session.findMany({
      where: {
        userId,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      select: { createdAt: true, lastActiveAt: true, revokedAt: true },
    }),
    prisma.employeeGoal.findMany({
      where: { employeeId, deletedAt: null },
      select: { progress: true, status: true },
    }),
    prisma.employeePromotion.count({
      where: {
        employeeId,
        effectiveDate: { gte: periodStart, lte: periodEnd },
      },
    }),
    prisma.securityEvent.count({
      where: {
        userId,
        severity: { in: ["HIGH", "CRITICAL"] },
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    }),
    prisma.employeeProfile.findUnique({
      where: { id: employeeId },
      select: { skills: true, designation: true },
    }),
    prisma.savedReport.count({
      where: {
        OR: [{ ownerId: userId }, { createdById: userId }],
        deletedAt: null,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    }).catch(() => 0),
    isManager
      ? prisma.employeeProfile.count({
          where: { managerId: userId, deletedAt: null },
        })
      : Promise.resolve(0),
  ]);

  const presentStatuses: AttendanceStatus[] = [
    "PRESENT",
    "REMOTE",
    "HALF_DAY",
    "LATE",
  ];
  const present = attendanceRows.filter((r) =>
    presentStatuses.includes(r.status),
  ).length;
  const late = attendanceRows.filter((r) => r.isLate || r.status === "LATE")
    .length;
  const absent = attendanceRows.filter((r) => r.status === "ABSENT").length;
  const workingMinutes = attendanceRows.reduce(
    (a, r) => a + (r.workingMinutes ?? 0),
    0,
  );
  const overtimeMinutes = attendanceRows.reduce(
    (a, r) => a + (r.overtimeMinutes ?? 0),
    0,
  );
  const logoutEvents = attendanceRows.filter((r) => r.checkOutAt != null).length;

  const loginDays = new Set(sessions.map((s) => dateOnlyIso(s.createdAt))).size;
  const sessionMinutes = sessions.reduce((a, s) => {
    const end = s.revokedAt ?? s.lastActiveAt ?? s.createdAt;
    return a + Math.max(0, (end.getTime() - s.createdAt.getTime()) / 60000);
  }, 0);
  const avgSessionMinutes =
    sessions.length === 0 ? 0 : sessionMinutes / sessions.length;

  const completed = tasks.filter((t) => t.status === "COMPLETED").length;
  const pending = tasks.filter(
    (t) => t.status === "TODO" || t.status === "IN_PROGRESS" || t.status === "REVIEW",
  ).length;
  const overdue = tasks.filter((t) => {
    if (!t.dueDate || t.status === "COMPLETED") return false;
    return t.dueDate.getTime() < periodEnd.getTime();
  }).length;
  const dueTasks = tasks.filter((t) => t.dueDate != null);
  const missed = dueTasks.filter((t) => {
    if (!t.dueDate) return false;
    if (t.status === "COMPLETED") {
      return t.updatedAt.getTime() > t.dueDate.getTime() + 86_400_000;
    }
    return t.dueDate.getTime() < periodEnd.getTime();
  }).length;
  const deadlineAccuracy =
    dueTasks.length === 0
      ? 75
      : clamp(((dueTasks.length - missed) / dueTasks.length) * 100);

  const projectTasks = tasks.filter((t) => t.projectId != null);
  const projectCompleted = projectTasks.filter(
    (t) => t.status === "COMPLETED",
  ).length;

  const goalsCompleted = goals.filter((g) => g.status === "COMPLETED").length;
  const goalsAvgProgress =
    goals.length === 0
      ? 0
      : goals.reduce((a, g) => a + g.progress, 0) / goals.length;
  const kpiCompletionRate =
    goals.length === 0 ? 0 : (goalsCompleted / goals.length) * 100;

  const metrics: PerformanceMetricCatalog = {
    attendancePresentDays: present,
    attendanceLateDays: late,
    attendanceAbsentDays: absent,
    leaveDays: leaveCount,
    workingMinutes,
    overtimeMinutes,
    loginDays,
    logoutEvents,
    avgSessionMinutes: Math.round(avgSessionMinutes),
    tasksAssigned: tasks.length,
    tasksCompleted: completed,
    tasksPending: pending,
    tasksOverdue: overdue,
    deadlineAccuracy,
    projectsJoined: projectMemberships,
    projectTasksCompleted: projectCompleted,
    teamMemberships,
    meetingsAttended: meetingCount,
    calendarEvents: calendarCount,
    messagesSent: messageCount,
    threadReplies: discussionReplies,
    aiConversations,
    aiDocuments,
    documentsCreated: filesCreated + aiDocuments,
    filesUploaded: filesCreated,
    fileUpdates,
    reportsSubmitted: typeof reportsCount === "number" ? reportsCount : 0,
    clientLinkedFiles: clientFiles,
    goalsCompleted,
    goalsAvgProgress: Math.round(goalsAvgProgress),
    kpiCompletionRate: Math.round(kpiCompletionRate),
    activityEvents: activityCount,
    promotionsCount: promotions,
    securityWarnings: securityEvents,
    skillsCount: employee?.skills?.length ?? 0,
  };

  const attendanceScore = clamp(
    attendanceRows.length === 0
      ? 70
      : (present / attendanceRows.length) * 100 - late * 3 - absent * 8,
  );
  const productivityScore = clamp(
    (tasks.length === 0 ? 55 : (completed / Math.max(tasks.length, 1)) * 45) +
      Math.min(workingMinutes / (480 * Math.max(present, 1)), 1) * 30 +
      Math.min(activityCount / 40, 1) * 25,
  );
  const disciplineScore = clamp(
    100 - late * 6 - absent * 10 - overdue * 8 - leaveCount * 2 - securityEvents * 12,
  );
  const collaborationScore = clamp(
    Math.min(teamMemberships * 12, 25) +
      Math.min(meetingCount * 8, 25) +
      Math.min(messageCount * 2, 20) +
      Math.min(discussionReplies * 5, 15) +
      Math.min(calendarCount * 4, 15),
  );
  const leadershipScore = isManager
    ? clamp(
        40 +
          Math.min(managedTeamSize * 8, 30) +
          Math.min(meetingCount * 4, 15) +
          (productivityScore >= 80 ? 15 : 0),
      )
    : clamp(collaborationScore * 0.55 + productivityScore * 0.25);
  const qualityScore = clamp(
    deadlineAccuracy * 0.55 +
      (tasks.length === 0 ? 35 : (completed / Math.max(tasks.length, 1)) * 45),
  );
  const communicationScore = clamp(
    Math.min(messageCount * 3, 40) +
      Math.min(discussionReplies * 6, 30) +
      Math.min(meetingCount * 6, 30),
  );
  const innovationScore = clamp(
    Math.min(aiConversations * 8, 40) +
      Math.min(aiDocuments * 10, 30) +
      Math.min((employee?.skills?.length ?? 0) * 5, 30),
  );
  const engagementScore = clamp(
    Math.min(loginDays * 6, 35) +
      Math.min(activityCount * 2, 35) +
      Math.min(aiConversations * 4, 15) +
      Math.min(meetingCount * 4, 15),
  );
  const consistencyScore = clamp(
    Math.min(loginDays * 7, 50) +
      (attendanceRows.length === 0
        ? 25
        : (present / attendanceRows.length) * 50),
  );

  const breakdown: PerformanceScoreBreakdown = {
    attendance: attendanceScore,
    productivity: productivityScore,
    discipline: disciplineScore,
    collaboration: collaborationScore,
    leadership: leadershipScore,
    quality: qualityScore,
    communication: communicationScore,
    innovation: innovationScore,
    engagement: engagementScore,
    consistency: consistencyScore,
  };

  const burnoutRisk = clamp(
    (overtimeMinutes > 600 ? 25 : overtimeMinutes / 30) +
      (avgSessionMinutes > 480 ? 20 : 0) +
      (overdue >= 3 ? 20 : overdue * 5) +
      (late >= 4 ? 15 : 0) +
      (100 - engagementScore) * 0.2,
  );
  const attritionRisk = clamp(
    (100 - engagementScore) * 0.35 +
      (100 - attendanceScore) * 0.2 +
      (100 - productivityScore) * 0.2 +
      burnoutRisk * 0.15 +
      securityEvents * 5,
  );

  const predictions: PerformancePredictions = {
    burnoutRisk,
    attritionRisk,
    engagementScore,
    consistencyScore,
  };

  const overallProxy = clamp(
    attendanceScore * 0.15 +
      productivityScore * 0.25 +
      disciplineScore * 0.1 +
      collaborationScore * 0.15 +
      qualityScore * 0.15 +
      engagementScore * 0.1 +
      innovationScore * 0.1,
  );

  const trainingPrograms: string[] = [];
  if (deadlineAccuracy < 70) trainingPrograms.push("Deadline & time management");
  if (collaborationScore < 60) trainingPrograms.push("Team collaboration workshop");
  if (communicationScore < 60) trainingPrograms.push("Business communication");
  if (innovationScore < 55) trainingPrograms.push("AI tools productivity");
  if (leadershipScore < 65 && isManager)
    trainingPrograms.push("People leadership essentials");
  if (burnoutRisk >= 60) trainingPrograms.push("Wellness & workload balance");
  if (trainingPrograms.length === 0 && overallProxy < 80) {
    trainingPrograms.push("Role excellence coaching");
  }

  const recommendations: PerformanceRecommendations = {
    promotionReady: overallProxy >= 85 && attritionRisk < 40,
    salaryReviewSuggested: overallProxy >= 80,
    bonusSuggested: overallProxy >= 80 && disciplineScore >= 70,
    trainingPrograms,
    managerReviewNeeded: overallProxy < 50 || attritionRisk >= 65 || burnoutRisk >= 70,
  };

  return { metrics, breakdown, predictions, recommendations };
}
