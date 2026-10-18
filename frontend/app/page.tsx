
"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import {
  LayoutDashboard,
  Compass,
  FileText,
  CalendarDays,
  Target,
  UserRound,
  Bell,
  Search,
  ChevronRight,
  ArrowUpRight,
  Sparkles,
  BriefcaseBusiness,
  MapPin,
  Clock3,
  CheckCircle2,
  Circle,
  Bookmark,
  Menu,
  X,
  BrainCircuit,
  TrendingUp,
  Upload,
  Download,
  FileCheck,
  RefreshCw,
  AlertCircle,
  GraduationCap,
} from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const DEVELOPMENT_USER_ID = "student001";

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localDateFromTimestamp(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : localDateString(date);
}

function daysUntilLocalDate(value: string | null) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const target = Date.UTC(year, month - 1, day);
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor((target - today) / 86_400_000);
}

function opportunityId(job: Job, index: number) {
  return (
    job.job_id ||
    job.job_apply_link ||
    `${job.job_title || "job"}-${job.employer_name || index}`
  );
}

const navigation = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Discover", icon: Compass },
  { label: "Resume Agent", icon: FileText },
  { label: "My Profile", icon: UserRound },
  { label: "Applications", icon: BriefcaseBusiness },
  { label: "Deadlines", icon: CalendarDays },
  { label: "Skill Analysis", icon: Target },
];

type Job = {
  job_id?: string;
  job_title?: string;
  employer_name?: string;
  employer_logo?: string | null;
  job_city?: string | null;
  job_state?: string | null;
  job_country?: string | null;
  job_is_remote?: boolean;
  job_employment_type?: string | null;
  job_min_salary?: number | null;
  job_max_salary?: number | null;
  job_salary_currency?: string | null;
  job_salary_period?: string | null;
  job_apply_link?: string | null;
  job_description?: string | null;
  job_posted_at?: string | null;
  job_posted_at_datetime_utc?: string | null;
  job_offer_expiration_datetime_utc?: string | null;
};

type ResumeAnalysis = {
  filename: string;
  character_count: number;
  skills_found: string[];
  skills_count: number;
  sections_detected: string[];
  job_skills_found: string[];
  matching_skills: string[];
  potential_skill_gaps: string[];
  note: string;
};


type StudentProfile = {
  user_id: string;
  full_name: string;
  email: string;
  education: string;
  university: string;
  graduation_year: number | null;
  skills: string[];
  projects: string[];
  experience: string;
  career_interests: string[];
  preferred_locations: string[];
  opportunity_types: string[];
};

type ApplicationStatus = "Saved" | "Applied" | "Interview" | "Offer" | "Rejected";

type ApplicationRecord = {
  id: number;
  user_id: string;
  opportunity_id: string;
  job_title: string;
  employer_name: string;
  job_url: string;
  status: ApplicationStatus;
  application_date: string | null;
  notes: string;
  follow_up_date: string | null;
  application_deadline_date: string | null;
  deadline_source: string;
  follow_up_completed: boolean;
  application_deadline_completed: boolean;
  created_at: string;
  updated_at: string;
};

type DeadlineRecord = {
  id: string;
  title: string;
  due_date: string | null;
  source: string;
  completed: boolean;
  created_at: string;
  kind: "deadline" | "follow-up" | "application-deadline";
};

type RoadmapTask = {
  user_id: string;
  task_id: string;
  title: string;
  description: string;
  category: string;
  priority: number;
  completed: boolean;
  updated_at?: string;
};

type MatchResult = {
  score: number | null;
  reasons: string[];
  matching_skills: string[];
  missing_skills: string[];
  scored_dimensions: number;
  note: string;
};

export default function Home() {
  const [active, setActive] = useState("Overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");

  // Live job search
  const [search, setSearch] = useState("software developer jobs in India");
  const [submittedQuery, setSubmittedQuery] = useState(
    "software developer jobs in India"
  );
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [employmentFilter, setEmploymentFilter] = useState("All");
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsError, setApplicationsError] = useState("");
  const [applicationFilter, setApplicationFilter] = useState("All");
  const [applicationBusy, setApplicationBusy] = useState(false);
  const [deadlines, setDeadlines] = useState<DeadlineRecord[]>([]);
  const [deadlinesLoading, setDeadlinesLoading] = useState(false);
  const [deadlinesError, setDeadlinesError] = useState("");
  const [deadlineTitle, setDeadlineTitle] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlineSource, setDeadlineSource] = useState("");
  const [roadmap, setRoadmap] = useState<RoadmapTask[]>([]);
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [roadmapError, setRoadmapError] = useState("");
  const [roadmapMessage, setRoadmapMessage] = useState("");
  const [matchScores, setMatchScores] = useState<Record<string, MatchResult>>({});
  const [matchError, setMatchError] = useState("");
  const [selectedSkillJob, setSelectedSkillJob] = useState("");
  const [careerGoal, setCareerGoal] = useState("");

  // Resume Agent
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [resumeError, setResumeError] = useState("");
  const [resumeMessage, setResumeMessage] = useState("");

  // Profile Agent
  const [profile, setProfile] = useState<StudentProfile>({
    user_id: DEVELOPMENT_USER_ID,
    full_name: "",
    email: "",
    education: "",
    university: "",
    graduation_year: null,
    skills: [],
    projects: [],
    experience: "",
    career_interests: [],
    preferred_locations: [],
    opportunity_types: [],
  });

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileMessage, setProfileMessage] = useState("");

  const [skillsInput, setSkillsInput] = useState("");
  const [projectsInput, setProjectsInput] = useState("");
  const [interestsInput, setInterestsInput] = useState("");
  const [locationsInput, setLocationsInput] = useState("");
  const [opportunityTypesInput, setOpportunityTypesInput] = useState("");


  useEffect(() => {
    const controller = new AbortController();

    async function fetchJobs() {
      setJobsLoading(true);
      setJobsError("");

      try {
        const url = new URL(`${API_BASE}/jobs`);
        url.searchParams.set("query", submittedQuery);

        const response = await fetch(url.toString(), {
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.detail || `Job search failed (${response.status}).`);
        }

        const result = await response.json();
        setJobs(Array.isArray(result.jobs) ? result.jobs : []);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;

        setJobsError(
          error instanceof Error
            ? error.message
            : "Unable to load jobs."
        );
      } finally {
        if (!controller.signal.aborted) setJobsLoading(false);
      }
    }

    fetchJobs();
    return () => controller.abort();
  }, [submittedQuery]);

  async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, init);
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        result.detail || `Request failed with status ${response.status}.`
      );
    }

    return result as T;
  }

  async function loadProfile(silent = false) {
    setProfileLoading(true);
    setProfileError("");
    setProfileMessage("");

    try {
      const response = await fetch(`${API_BASE}/profile/${profile.user_id}`);
      if (response.status === 404) {
        if (!silent) {
          setProfileMessage(
            "No saved profile found. Fill in your details and save."
          );
        }
        return;
      }

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.detail || "Could not load profile.");
      }
      const loaded = result as StudentProfile;
      setProfile(loaded);
      setSkillsInput(loaded.skills.join(", "));
      setProjectsInput(loaded.projects.join(", "));
      setInterestsInput(loaded.career_interests.join(", "));
      setLocationsInput(loaded.preferred_locations.join(", "));
      setOpportunityTypesInput(loaded.opportunity_types.join(", "));
    } catch (error) {
      setProfileError(
        error instanceof Error ? error.message : "Could not load profile."
      );
    } finally {
      setProfileLoading(false);
    }
  }

  async function loadApplications() {
    setApplicationsLoading(true);
    setApplicationsError("");
    try {
      const rows = await apiRequest<ApplicationRecord[]>(
        `/applications/${profile.user_id}`
      );
      setApplications(rows);
    } catch (error) {
      setApplicationsError(
        error instanceof Error
          ? error.message
          : "Could not load applications."
      );
    } finally {
      setApplicationsLoading(false);
    }
  }

  async function loadDeadlines() {
    setDeadlinesLoading(true);
    setDeadlinesError("");
    try {
      setDeadlines(
        await apiRequest<DeadlineRecord[]>(`/deadlines/${profile.user_id}`)
      );
    } catch (error) {
      setDeadlinesError(
        error instanceof Error ? error.message : "Could not load deadlines."
      );
    } finally {
      setDeadlinesLoading(false);
    }
  }

  async function loadRoadmap() {
    setRoadmapLoading(true);
    setRoadmapError("");
    try {
      setRoadmap(
        await apiRequest<RoadmapTask[]>(`/roadmap/${profile.user_id}`)
      );
    } catch (error) {
      setRoadmapError(
        error instanceof Error ? error.message : "Could not load your roadmap."
      );
    } finally {
      setRoadmapLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspace() {
      await Promise.all([
        loadProfile(true),
        loadApplications(),
        loadDeadlines(),
        loadRoadmap(),
      ]);
      if (cancelled) return;
    }

    void loadWorkspace();
    return () => {
      cancelled = true;
    };
    // These initial requests are for the fixed development profile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadScores() {
      if (jobs.length === 0) {
        setMatchScores({});
        setMatchError("");
        return;
      }

      setMatchError("");
      try {
        const scores = await apiRequest<
          Array<MatchResult & { opportunity_id: string }>
        >("/matching/scores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile, opportunities: jobs }),
        });
        if (cancelled) return;
        setMatchScores(
          Object.fromEntries(
            scores.map((score) => [score.opportunity_id, score])
          )
        );
      } catch (error) {
        if (cancelled) return;
        setMatchError(
          error instanceof Error
            ? error.message
            : "Could not calculate opportunity matches."
        );
      }
    }

    const timeout = window.setTimeout(() => void loadScores(), 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [jobs, profile]);

  function choosePage(label: string) {
    setActive(label);
    setMenuOpen(false);
    setNotice("");
    if (label === "My Profile") {
      void loadProfile(true);
    } else if (label === "Applications") {
      void loadApplications();
    } else if (label === "Deadlines") {
      void loadDeadlines();
    } else if (label === "Skill Analysis" || label === "Overview") {
      void loadRoadmap();
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileSaving(true);
    setProfileError("");
    setProfileMessage("");

    const updatedProfile: StudentProfile = {
      ...profile,
      skills: skillsInput.split(",").map((item) => item.trim()).filter(Boolean),
      projects: projectsInput.split(",").map((item) => item.trim()).filter(Boolean),
      career_interests: interestsInput
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      preferred_locations: locationsInput
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      opportunity_types: opportunityTypesInput
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    };

    try {
      const response = await fetch(`${API_BASE}/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedProfile),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Could not save profile.");
      }

      setProfile(updatedProfile);
      setProfileMessage("Profile saved successfully!");
    } catch (error) {
      setProfileError(
        error instanceof Error
          ? error.message
          : "Could not save profile."
      );
    } finally {
      setProfileSaving(false);
    }
  }

  function submitJobSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!search.trim()) return;
    setSubmittedQuery(search.trim());
    setSelectedSkillJob("");
    setActive("Discover");
  }

  async function trackOpportunity(
    job: Job,
    id: string,
    status: ApplicationStatus,
    applicationDate: string | null = null
  ) {
    const existing = applications.find(
      (application) => application.opportunity_id === id
    );
    setApplicationBusy(true);
    setApplicationsError("");
    try {
      const tracked = await apiRequest<ApplicationRecord>("/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: profile.user_id,
          opportunity_id: id,
          job_title: job.job_title || "Untitled position",
          employer_name: job.employer_name || "",
          job_url: job.job_apply_link || "",
          status,
          application_date:
            applicationDate || existing?.application_date || null,
          notes: existing?.notes || "",
          follow_up_date: existing?.follow_up_date || null,
          application_deadline_date:
            localDateFromTimestamp(job.job_offer_expiration_datetime_utc) ||
            existing?.application_deadline_date ||
            null,
          deadline_source:
            job.job_apply_link || existing?.deadline_source || "",
        }),
      });
      setApplications((old) => [
        tracked,
        ...old.filter((item) => item.opportunity_id !== id),
      ]);
      setNotice(`${tracked.status} opportunity saved to Applications.`);
      await loadDeadlines();
    } catch (error) {
      setApplicationsError(
        error instanceof Error
          ? error.message
          : "Could not save this opportunity."
      );
    } finally {
      setApplicationBusy(false);
    }
  }

  async function toggleSaved(id: string, job: Job) {
    const existing = applications.find((item) => item.opportunity_id === id);
    if (!existing) {
      await trackOpportunity(job, id, "Saved");
      return;
    }
    if (existing.status !== "Saved") {
      setNotice(
        `This opportunity is already tracked as ${existing.status}. Update it in Applications.`
      );
      return;
    }
    if (!window.confirm("Remove this saved opportunity from your tracker?")) {
      return;
    }

    setApplicationBusy(true);
    try {
      await apiRequest<{ message: string }>(
        `/applications/${existing.id}?user_id=${encodeURIComponent(profile.user_id)}`,
        { method: "DELETE" }
      );
      setApplications((old) => old.filter((item) => item.id !== existing.id));
      setNotice("Saved opportunity removed from Applications.");
      await loadDeadlines();
    } catch (error) {
      setApplicationsError(
        error instanceof Error
          ? error.message
          : "Could not remove the saved opportunity."
      );
    } finally {
      setApplicationBusy(false);
    }
  }

  async function saveApplicationDetails(
    event: FormEvent<HTMLFormElement>,
    application: ApplicationRecord
  ) {
    event.preventDefault();
    setApplicationBusy(true);
    setApplicationsError("");
    try {
      const { id, ...payload } = application;
      const savedApplication = await apiRequest<ApplicationRecord>(
        `/applications/${id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      setApplications((old) =>
        old.map((item) => (item.id === id ? savedApplication : item))
      );
      setNotice("Application details saved.");
      await loadDeadlines();
    } catch (error) {
      setApplicationsError(
        error instanceof Error
          ? error.message
          : "Could not update this application."
      );
    } finally {
      setApplicationBusy(false);
    }
  }

  async function removeApplication(application: ApplicationRecord) {
    if (!window.confirm(`Delete the ${application.job_title} application?`)) {
      return;
    }
    setApplicationBusy(true);
    setApplicationsError("");
    try {
      await apiRequest<{ message: string }>(
        `/applications/${application.id}?user_id=${encodeURIComponent(profile.user_id)}`,
        { method: "DELETE" }
      );
      setApplications((old) => old.filter((item) => item.id !== application.id));
      setNotice("Application deleted.");
      await loadDeadlines();
    } catch (error) {
      setApplicationsError(
        error instanceof Error
          ? error.message
          : "Could not delete this application."
      );
    } finally {
      setApplicationBusy(false);
    }
  }

  async function createDeadline(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDeadlinesError("");
    try {
      const created = await apiRequest<DeadlineRecord>("/deadlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: profile.user_id,
          title: deadlineTitle.trim(),
          due_date: deadlineDate || null,
          source: deadlineSource.trim(),
        }),
      });
      setDeadlines((old) => [...old, created]);
      setDeadlineTitle("");
      setDeadlineDate("");
      setDeadlineSource("");
      setNotice("Reminder saved.");
    } catch (error) {
      setDeadlinesError(
        error instanceof Error ? error.message : "Could not add this deadline."
      );
    }
  }

  async function toggleDeadline(deadline: DeadlineRecord) {
    setDeadlinesError("");
    try {
      const updated = await apiRequest<{ id: string; completed: boolean }>(
        `/deadlines/${deadline.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: profile.user_id,
            completed: !deadline.completed,
          }),
        }
      );
      setDeadlines((old) =>
        old.map((item) =>
          item.id === updated.id
            ? { ...item, completed: updated.completed }
            : item
        )
      );
      setNotice(
        updated.completed ? "Deadline marked complete." : "Deadline marked incomplete."
      );
      if (deadline.kind !== "deadline") {
        const applicationId = Number(
          deadline.id.replace(/^application-(?:deadline-)?/, "")
        );
        setApplications((old) =>
          old.map((item) =>
            item.id !== applicationId
              ? item
              : deadline.kind === "follow-up"
                ? { ...item, follow_up_completed: updated.completed }
                : { ...item, application_deadline_completed: updated.completed }
          )
        );
      }
    } catch (error) {
      setDeadlinesError(
        error instanceof Error
          ? error.message
          : "Could not update this deadline."
      );
    }
  }

  async function removeDeadline(deadline: DeadlineRecord) {
    if (!window.confirm(`Delete "${deadline.title}"?`)) return;
    setDeadlinesError("");
    try {
      await apiRequest<{ message: string }>(
        `/deadlines/${deadline.id}?user_id=${encodeURIComponent(profile.user_id)}`,
        { method: "DELETE" }
      );
      setDeadlines((old) => old.filter((item) => item.id !== deadline.id));
      setNotice("Deadline removed.");
      if (deadline.kind !== "deadline") {
        const applicationId = Number(
          deadline.id.replace(/^application-(?:deadline-)?/, "")
        );
        setApplications((old) =>
          old.map((item) =>
            item.id !== applicationId
              ? item
              : deadline.kind === "follow-up"
                ? { ...item, follow_up_date: null, follow_up_completed: false }
                : {
                    ...item,
                    application_deadline_date: null,
                    application_deadline_completed: false,
                  }
          )
        );
      }
    } catch (error) {
      setDeadlinesError(
        error instanceof Error ? error.message : "Could not remove this deadline."
      );
    }
  }

  async function setRoadmapTask(task: RoadmapTask, completed: boolean) {
    setRoadmapError("");
    try {
      await apiRequest<{ task_id: string; completed: boolean }>(
        `/roadmap/${encodeURIComponent(task.task_id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: profile.user_id, completed }),
        }
      );
      setRoadmap((old) =>
        old.map((item) =>
          item.task_id === task.task_id ? { ...item, completed } : item
        )
      );
      setRoadmapMessage("Roadmap progress saved.");
    } catch (error) {
      setRoadmapError(
        error instanceof Error
          ? error.message
          : "Could not update this roadmap task."
      );
    }
  }

  async function generateRoadmap() {
    const target =
      careerGoal.trim() ||
      profile.career_interests[0] ||
      submittedQuery.trim() ||
      "your next career opportunity";
    const slug = target.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
    const skillGaps = Array.from(
      new Set(
        Object.values(matchScores).flatMap((match) => match.missing_skills)
      )
    ).slice(0, 4);
    const tasksToSave: RoadmapTask[] = [
      {
        user_id: profile.user_id,
        task_id: `direction-${slug}`,
        title: `Confirm your ${target} direction`,
        description:
          "Compare this target with your saved interests, education, and preferred opportunity types; adjust the goal if your priorities change.",
        category: "Direction",
        priority: 0,
        completed: false,
      },
      ...(skillGaps.length
        ? skillGaps.map((skill, index) => ({
            user_id: profile.user_id,
            task_id: `skill-${slug}-${skill.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
            title: `Build evidence for ${skill}`,
            description: `A matching listing identifies ${skill} as a relevant skill not present in your saved profile. Practice it and add evidence only after you can demonstrate it.`,
            category: "Skill development",
            priority: index + 1,
            completed: false,
          }))
        : [
            {
              user_id: profile.user_id,
              task_id: `skills-${slug}`,
              title: "Review skills against a target opportunity",
              description:
                "Choose a live listing in Skill Analysis to identify relevant skills and evidence-based development steps.",
              category: "Skill development",
              priority: 1,
              completed: false,
            },
          ]),
      {
        user_id: profile.user_id,
        task_id: `project-${slug}`,
        title: `Create a project relevant to ${target}`,
        description:
          "Build a small, verifiable project that demonstrates skills from your selected opportunities, then record it in your profile.",
        category: "Project",
        priority: 5,
        completed: false,
      },
      {
        user_id: profile.user_id,
        task_id: `resume-${slug}`,
        title: "Review your resume for relevant evidence",
        description:
          "Use the keyword-based Resume Agent analysis and add only accurate, supported experience.",
        category: "Resume",
        priority: 6,
        completed: false,
      },
      {
        user_id: profile.user_id,
        task_id: `applications-${slug}`,
        title: "Track relevant applications and follow-ups",
        description:
          "Save suitable live listings, record application status, and add follow-up dates you have confirmed.",
        category: "Applications",
        priority: 7,
        completed: false,
      },
    ];

    setRoadmapError("");
    setRoadmapMessage("");
    setRoadmapLoading(true);
    try {
      await Promise.all(
        tasksToSave.map((task) =>
          apiRequest("/roadmap", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(task),
          })
        )
      );
      await loadRoadmap();
      setRoadmapMessage(`Career roadmap saved for ${target}.`);
    } catch (error) {
      setRoadmapError(
        error instanceof Error ? error.message : "Could not generate your roadmap."
      );
    } finally {
      setRoadmapLoading(false);
    }
  }

  async function addSkillTask(skill: string) {
    const task: RoadmapTask = {
      user_id: profile.user_id,
      task_id: `skill-${skill.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      title: `Develop and demonstrate ${skill}`,
      description: `A selected live opportunity mentions ${skill}, which is not listed among your saved profile skills. Complete a small practice project or learning activity that lets you demonstrate it before adding it to your profile.`,
      category: "Skill development",
      priority: 1,
      completed: false,
    };
    setRoadmapError("");
    try {
      await apiRequest("/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
      });
      await loadRoadmap();
      setRoadmapMessage(`Added a development task for ${skill}.`);
    } catch (error) {
      setRoadmapError(
        error instanceof Error ? error.message : "Could not save this skill task."
      );
    }
  }

  function handleFileChange(file: File | null) {
    setResumeError("");
    setResumeMessage("");
    setAnalysis(null);

    if (!file) {
      setResumeFile(null);
      return;
    }

    const allowed = /\.(pdf|docx|txt)$/i.test(file.name);

    if (!allowed) {
      setResumeFile(null);
      setResumeError("Please choose a PDF, DOCX, or TXT resume.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setResumeFile(null);
      setResumeError("Your resume must be 5 MB or smaller.");
      return;
    }

    setResumeFile(file);
  }

  async function analyzeResume(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!resumeFile) {
      setResumeError("Please upload your resume first.");
      return;
    }

    setResumeLoading(true);
    setResumeError("");
    setResumeMessage("");
    setAnalysis(null);

    try {
      const formData = new FormData();
      formData.append("file", resumeFile);
      formData.append("job_description", jobDescription);

      const response = await fetch(`${API_BASE}/resume/analyze`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Resume analysis failed.");
      }

      setAnalysis(result);
      setResumeMessage("Resume analysed successfully.");
    } catch (error) {
      setResumeError(
        error instanceof Error
          ? error.message
          : "Could not analyse the resume."
      );
    } finally {
      setResumeLoading(false);
    }
  }

  async function generateResume() {
    if (!resumeFile) {
      setResumeError("Upload a resume before generating a PDF.");
      return;
    }

    setPdfLoading(true);
    setResumeError("");
    setResumeMessage("");

    try {
      const formData = new FormData();
      formData.append("file", resumeFile);
      formData.append("job_title", jobTitle.trim() || "Target Position");
      formData.append("job_description", jobDescription);

      const response = await fetch(`${API_BASE}/resume/generate`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.detail || "PDF generation failed.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = `OpportunityOS_${(jobTitle.trim() || "Resume")
        .replace(/[^a-zA-Z0-9_-]+/g, "_")
        .slice(0, 50)}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);

      setResumeMessage("Your PDF has been generated and downloaded.");
    } catch (error) {
      setResumeError(
        error instanceof Error
          ? error.message
          : "Could not generate your PDF."
      );
    } finally {
      setPdfLoading(false);
    }
  }

  function renderProfileAgent() {
    const inputClass =
      "w-full rounded-xl border border-white/[0.09] bg-[#080e1a] px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-orange-400/50";
    const labelClass =
      "mb-2 block text-xs font-medium text-slate-300";

    return (
      <div className="space-y-6">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-orange-300">
            <UserRound size={14} /> PROFILE AGENT
          </div>
          <h2 className="text-2xl font-semibold sm:text-3xl">
            Build your <span className="text-orange-400">student profile.</span>
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Save your education, skills and career goals to personalize
            future opportunity recommendations.
          </p>
        </div>

        {profileLoading && (
          <p className="text-sm text-slate-400">Loading your saved profile...</p>
        )}

        <form
          onSubmit={saveProfile}
          className="space-y-6 rounded-2xl border border-white/[0.07] bg-[#0c1423] p-5 sm:p-7"
        >
          <div>
            <h3 className="font-semibold">Personal information</h3>
            <p className="mt-1 text-xs text-slate-500">
              Profile ID: {profile.user_id}
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="profile-full-name" className={labelClass}>Full name</label>
              <input
                id="profile-full-name"
                className={inputClass}
                value={profile.full_name}
                onChange={(e) =>
                  setProfile({ ...profile, full_name: e.target.value })
                }
                placeholder="Your full name"
              />
            </div>

            <div>
              <label htmlFor="profile-email" className={labelClass}>Email</label>
              <input
                id="profile-email"
                type="email"
                className={inputClass}
                value={profile.email}
                onChange={(e) =>
                  setProfile({ ...profile, email: e.target.value })
                }
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="profile-education" className={labelClass}>Degree / education</label>
              <input
                id="profile-education"
                className={inputClass}
                value={profile.education}
                onChange={(e) =>
                  setProfile({ ...profile, education: e.target.value })
                }
                placeholder="e.g. B.Tech in Computer Engineering"
              />
            </div>

            <div>
              <label htmlFor="profile-university" className={labelClass}>University / college</label>
              <input
                id="profile-university"
                className={inputClass}
                value={profile.university}
                onChange={(e) =>
                  setProfile({ ...profile, university: e.target.value })
                }
                placeholder="Your institution"
              />
            </div>

            <div>
              <label htmlFor="profile-graduation-year" className={labelClass}>Graduation year</label>
              <input
                id="profile-graduation-year"
                type="number"
                min="2000"
                max="2100"
                className={inputClass}
                value={profile.graduation_year ?? ""}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    graduation_year: e.target.value
                      ? Number(e.target.value)
                      : null,
                  })
                }
                placeholder="e.g. 2027"
              />
            </div>

            <div>
              <label htmlFor="profile-experience" className={labelClass}>Experience</label>
              <input
                id="profile-experience"
                className={inputClass}
                value={profile.experience}
                onChange={(e) =>
                  setProfile({ ...profile, experience: e.target.value })
                }
                placeholder="Internships, work or student experience"
              />
            </div>
          </div>

          <div className="border-t border-white/[0.07] pt-5">
            <h3 className="font-semibold">Skills and projects</h3>
            <p className="mt-1 text-xs text-slate-500">
              Separate multiple entries with commas.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="profile-skills" className={labelClass}>Skills</label>
              <textarea
                id="profile-skills"
                rows={3}
                className={inputClass}
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                placeholder="Python, React, SQL, Communication"
              />
            </div>

            <div>
              <label htmlFor="profile-projects" className={labelClass}>Projects</label>
              <textarea
                id="profile-projects"
                rows={3}
                className={inputClass}
                value={projectsInput}
                onChange={(e) => setProjectsInput(e.target.value)}
                placeholder="OpportunityOS, portfolio website"
              />
            </div>

            <div>
              <label htmlFor="profile-interests" className={labelClass}>Career interests</label>
              <textarea
                id="profile-interests"
                rows={3}
                className={inputClass}
                value={interestsInput}
                onChange={(e) => setInterestsInput(e.target.value)}
                placeholder="AI, Software Development, Data Science"
              />
            </div>

            <div>
              <label htmlFor="profile-locations" className={labelClass}>Preferred locations</label>
              <textarea
                id="profile-locations"
                rows={3}
                className={inputClass}
                value={locationsInput}
                onChange={(e) => setLocationsInput(e.target.value)}
                placeholder="Mumbai, Pune, Remote"
              />
            </div>
          </div>

          <div>
            <label htmlFor="profile-opportunity-types" className={labelClass}>Opportunity types</label>
            <input
              id="profile-opportunity-types"
              className={inputClass}
              value={opportunityTypesInput}
              onChange={(e) => setOpportunityTypesInput(e.target.value)}
              placeholder="Internship, Full-time, Research"
            />
          </div>

          {profileError && (
            <div className="rounded-xl border border-red-400/20 bg-red-400/[0.06] p-3 text-sm text-red-300">
              {profileError}
            </div>
          )}

          {profileMessage && (
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3 text-sm text-emerald-300">
              {profileMessage}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={profileSaving || profileLoading}
              className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-400 disabled:opacity-50"
            >
              {profileSaving ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <CheckCircle2 size={16} />
              )}
              {profileSaving ? "Saving..." : "Save profile"}
            </button>

            <button
              type="button"
              onClick={() => void loadProfile()}
              disabled={profileLoading || profileSaving}
              className="rounded-xl border border-white/[0.1] px-5 py-3 text-sm text-slate-200 hover:bg-white/[0.05] disabled:opacity-50"
            >
              {profileLoading ? "Loading..." : "Reload saved profile"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  const savedCount = applications.filter(
    (application) => application.status === "Saved"
  ).length;
  const activeApplicationCount = applications.filter(
    (application) => application.status !== "Saved"
  ).length;
  const completedRoadmapCount = roadmap.filter((task) => task.completed).length;
  const profileFields = [
    profile.full_name,
    profile.email,
    profile.education,
    profile.university,
    profile.graduation_year,
    profile.skills.length,
    profile.career_interests.length,
    profile.preferred_locations.length,
    profile.opportunity_types.length,
  ];
  const profileCompletion = Math.round(
    (profileFields.filter(Boolean).length / profileFields.length) * 100
  );
  const dueSoonCount = deadlines.filter((deadline) => {
    const days = daysUntilLocalDate(deadline.due_date);
    return !deadline.completed && days !== null && days >= 0 && days <= 7;
  }).length;

  function renderApplications() {
    const visibleApplications =
      applicationFilter === "All"
        ? applications
        : applications.filter(
            (application) => application.status === applicationFilter
          );

    return (
      <div className="space-y-6">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-orange-300">
            <BriefcaseBusiness size={14} /> APPLICATION TRACKER
          </div>
          <h2 className="text-2xl font-semibold sm:text-3xl">
            Keep every opportunity <span className="text-orange-400">moving.</span>
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Saved listings, application status, notes, and follow-up dates are stored in your local profile database.
          </p>
        </div>

        {applicationsError && (
          <div className="rounded-xl border border-red-400/20 bg-red-400/[0.06] p-4 text-sm text-red-300">
            {applicationsError}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-400">
            {applications.length} tracked opportunit
            {applications.length === 1 ? "y" : "ies"}
          </p>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            Filter
            <select
              value={applicationFilter}
              onChange={(event) => setApplicationFilter(event.target.value)}
              className="rounded-lg border border-white/[0.1] bg-[#0c1423] px-3 py-2 text-slate-200"
            >
              {["All", "Saved", "Applied", "Interview", "Offer", "Rejected"].map(
                (status) => (
                  <option key={status}>{status}</option>
                )
              )}
            </select>
          </label>
        </div>

        {applicationsLoading && (
          <p className="text-sm text-slate-400">Loading your applications...</p>
        )}
        {!applicationsLoading && visibleApplications.length === 0 && (
          <div className="rounded-2xl border border-white/[0.07] bg-[#0c1423] p-8 text-sm text-slate-400">
            {applications.length
              ? "There are no applications in this status."
              : "No opportunities tracked yet. Save a live listing in Discover to get started."}
          </div>
        )}

        <div className="space-y-4">
          {visibleApplications.map((application) => (
            <form
              key={application.id}
              onSubmit={(event) => saveApplicationDetails(event, application)}
              className="space-y-5 rounded-2xl border border-white/[0.07] bg-[#0c1423] p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{application.job_title}</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    {application.employer_name || "Company not listed"}
                  </p>
                  {application.job_url && (
                    <a
                      href={application.job_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs text-orange-300 hover:text-orange-200"
                    >
                      Open original listing <ArrowUpRight size={13} />
                    </a>
                  )}
                </div>
                <span className="rounded-lg bg-white/[0.05] px-3 py-1.5 text-xs text-slate-300">
                  {application.status}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <label className="text-xs text-slate-400">
                  Status
                  <select
                    value={application.status}
                    onChange={(event) =>
                      setApplications((old) =>
                        old.map((item) =>
                          item.id === application.id
                            ? {
                                ...item,
                                status: event.target.value as ApplicationStatus,
                                application_date:
                                  event.target.value === "Saved"
                                    ? null
                                    : item.application_date || localDateString(),
                              }
                            : item
                        )
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-white/[0.1] bg-[#080e1a] px-3 py-2.5 text-sm text-slate-200"
                  >
                    {["Saved", "Applied", "Interview", "Offer", "Rejected"].map(
                      (status) => (
                        <option key={status}>{status}</option>
                      )
                    )}
                  </select>
                </label>
                <label className="text-xs text-slate-400">
                  Application date
                  <input
                    type="date"
                    value={application.application_date || ""}
                    onChange={(event) =>
                      setApplications((old) =>
                        old.map((item) =>
                          item.id === application.id
                            ? {
                                ...item,
                                application_date: event.target.value || null,
                              }
                            : item
                        )
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-white/[0.1] bg-[#080e1a] px-3 py-2.5 text-sm text-slate-200"
                  />
                </label>
                <label className="text-xs text-slate-400">
                  Follow-up date
                  <input
                    type="date"
                    value={application.follow_up_date || ""}
                    onChange={(event) =>
                      setApplications((old) =>
                        old.map((item) =>
                          item.id === application.id
                            ? { ...item, follow_up_date: event.target.value || null }
                            : item
                        )
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-white/[0.1] bg-[#080e1a] px-3 py-2.5 text-sm text-slate-200"
                  />
                </label>
              </div>

              <label className="block text-xs text-slate-400">
                Notes
                <textarea
                  rows={3}
                  maxLength={5000}
                  value={application.notes}
                  onChange={(event) =>
                    setApplications((old) =>
                      old.map((item) =>
                        item.id === application.id
                          ? { ...item, notes: event.target.value }
                          : item
                      )
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-white/[0.1] bg-[#080e1a] px-3 py-2.5 text-sm text-slate-200"
                  placeholder="Interview notes, contact details, or next steps"
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={applicationBusy}
                  className="rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-semibold disabled:opacity-50"
                >
                  {applicationBusy ? "Saving..." : "Save changes"}
                </button>
                <button
                  type="button"
                  disabled={applicationBusy}
                  onClick={() => void removeApplication(application)}
                  className="rounded-xl border border-red-400/20 px-4 py-2.5 text-xs text-red-300 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </form>
          ))}
        </div>
      </div>
    );
  }

  function renderDeadlines() {
    const deadlineStatus = (deadline: DeadlineRecord) => {
      if (deadline.completed) return "Completed";
      const days = daysUntilLocalDate(deadline.due_date);
      if (days === null) return "Date not provided";
      if (days < 0) return "Overdue";
      if (days <= 7) return days === 0 ? "Due today" : "Due soon";
      return "Upcoming";
    };

    return (
      <div className="space-y-6">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-orange-300">
            <CalendarDays size={14} /> DEADLINE AGENT
          </div>
          <h2 className="text-2xl font-semibold sm:text-3xl">
            Your next steps, <span className="text-orange-400">on time.</span>
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Application follow-ups are listed alongside dates you add. Listings without a published date stay undated.
          </p>
        </div>

        <form
          onSubmit={createDeadline}
          className="grid gap-4 rounded-2xl border border-white/[0.07] bg-[#0c1423] p-5 sm:grid-cols-2 xl:grid-cols-4"
        >
          <label className="text-xs text-slate-400">
            Action or deadline
            <input
              required
              maxLength={300}
              value={deadlineTitle}
              onChange={(event) => setDeadlineTitle(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/[0.1] bg-[#080e1a] px-3 py-2.5 text-sm text-slate-200"
              placeholder="Submit application"
            />
          </label>
          <label className="text-xs text-slate-400">
            Date (optional)
            <input
              type="date"
              value={deadlineDate}
              onChange={(event) => setDeadlineDate(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/[0.1] bg-[#080e1a] px-3 py-2.5 text-sm text-slate-200"
            />
          </label>
          <label className="text-xs text-slate-400">
            Source (optional)
            <input
              maxLength={1000}
              value={deadlineSource}
              onChange={(event) => setDeadlineSource(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/[0.1] bg-[#080e1a] px-3 py-2.5 text-sm text-slate-200"
              placeholder="Email, company page, or personal reminder"
            />
          </label>
          <button
            type="submit"
            className="self-end rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold"
          >
            Add reminder
          </button>
        </form>

        {deadlinesError && (
          <div className="rounded-xl border border-red-400/20 bg-red-400/[0.06] p-4 text-sm text-red-300">
            {deadlinesError}
          </div>
        )}
        {deadlinesLoading && (
          <p className="text-sm text-slate-400">Loading deadlines...</p>
        )}
        {!deadlinesLoading && deadlines.length === 0 && (
          <div className="rounded-2xl border border-white/[0.07] bg-[#0c1423] p-8 text-sm text-slate-400">
            No deadlines or follow-ups yet. Add a reminder above or set a follow-up date in Applications.
          </div>
        )}
        <div className="space-y-3">
          {deadlines.map((deadline) => {
            const status = deadlineStatus(deadline);
            const days = daysUntilLocalDate(deadline.due_date);
            const statusColor =
              status === "Overdue"
                ? "text-red-300"
                : status === "Due soon" || status === "Due today"
                  ? "text-amber-300"
                  : status === "Completed"
                    ? "text-emerald-300"
                    : "text-slate-400";

            return (
              <article
                key={`${deadline.kind}-${deadline.id}`}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.07] bg-[#0c1423] p-4 sm:p-5"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <button
                    type="button"
                    aria-label={deadline.completed ? "Mark incomplete" : "Mark complete"}
                    onClick={() => void toggleDeadline(deadline)}
                    className="mt-0.5 text-slate-400 hover:text-emerald-300"
                  >
                    {deadline.completed ? (
                      <CheckCircle2 size={19} className="text-emerald-400" />
                    ) : (
                      <Circle size={19} />
                    )}
                  </button>
                  <div className="min-w-0">
                    <h3 className={deadline.completed ? "text-sm text-slate-500 line-through" : "text-sm font-medium"}>
                      {deadline.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {deadline.due_date
                        ? new Date(`${deadline.due_date}T12:00:00`).toLocaleDateString()
                        : "No date provided"}
                      {" · "}
                      {deadline.source || "Source not provided"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs ${statusColor}`}>
                    {days !== null && status !== "Completed" && days >= 0
                      ? `${status} · ${days} day${days === 1 ? "" : "s"}`
                      : status}
                  </span>
                  <button
                    type="button"
                    onClick={() => void removeDeadline(deadline)}
                    className="rounded-lg border border-white/[0.08] px-3 py-2 text-xs text-slate-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    );
  }

  function renderSkillAnalysis() {
    const currentSkillJobId =
      selectedSkillJob || (jobs.length > 0 ? opportunityId(jobs[0], 0) : "");
    const selectedJob = jobs.find(
      (job, index) => opportunityId(job, index) === currentSkillJobId
    );
    const selectedMatch = matchScores[currentSkillJobId];
    const suggestionsFor = (skill: string) => {
      const normalized = skill.toLowerCase();
      if (normalized.includes("python")) {
        return "Build a small data-cleaning or API project in Python, and document the decisions and tests.";
      }
      if (normalized.includes("sql") || normalized.includes("database")) {
        return "Design a small relational schema and write queries that answer realistic reporting questions.";
      }
      if (normalized.includes("react") || normalized.includes("javascript")) {
        return "Build an accessible interactive feature and include error, loading, and empty states.";
      }
      if (normalized.includes("machine learning") || normalized.includes("ai")) {
        return "Reproduce a small model workflow with a public dataset, a baseline, and an explanation of limitations.";
      }
      return `Complete a focused practice project that demonstrates ${skill}, then record verifiable evidence before adding it to your profile.`;
    };

    return (
      <div className="space-y-6">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-orange-300">
            <Target size={14} /> SKILL GAP AGENT
          </div>
          <h2 className="text-2xl font-semibold sm:text-3xl">
            Turn listing requirements into a <span className="text-orange-400">learning plan.</span>
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Skill evidence comes from your saved profile and keyword detection in a live listing. Recommendations are practical activities, not claims about your ability.
          </p>
        </div>

        {jobs.length > 0 ? (
          <label className="block max-w-2xl text-xs text-slate-400">
            Select a live opportunity
            <select
              value={currentSkillJobId}
              onChange={(event) => setSelectedSkillJob(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/[0.1] bg-[#0c1423] px-4 py-3 text-sm text-slate-200"
            >
              {jobs.map((job, index) => (
                <option key={opportunityId(job, index)} value={opportunityId(job, index)}>
                  {job.job_title || "Untitled position"} — {job.employer_name || "Company not listed"}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="rounded-xl border border-white/[0.07] bg-[#0c1423] p-5 text-sm text-slate-400">
            Search for live opportunities in Discover to compare their published skills with your profile.
            <button
              onClick={() => choosePage("Discover")}
              className="ml-2 text-orange-300 underline"
            >
              Open Discover
            </button>
          </div>
        )}

        {matchError && (
          <div className="rounded-xl border border-red-400/20 bg-red-400/[0.06] p-4 text-sm text-red-300">
            {matchError}
          </div>
        )}
        {selectedJob && !selectedMatch && !matchError && (
          <p className="text-sm text-slate-400">Calculating a profile-based match...</p>
        )}
        {selectedJob && selectedMatch && (
          <div className="space-y-5">
            <section className="rounded-2xl border border-white/[0.07] bg-[#0c1423] p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{selectedJob.job_title || "Untitled position"}</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    {selectedJob.employer_name || "Company not listed"}
                  </p>
                </div>
                <p className="text-3xl font-semibold text-orange-300">
                  {selectedMatch.score === null ? "—" : `${selectedMatch.score}%`}
                </p>
              </div>
              <p className="mt-2 text-xs text-slate-500">{selectedMatch.note}</p>
              <ul className="mt-4 space-y-2">
                {selectedMatch.reasons.map((reason) => (
                  <li key={reason} className="flex gap-2 text-sm text-slate-300">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-orange-300" />
                    {reason}
                  </li>
                ))}
              </ul>
            </section>

            <div className="grid gap-5 xl:grid-cols-2">
              <section className="rounded-2xl border border-white/[0.07] bg-[#0c1423] p-5">
                <h3 className="font-semibold">Skills in your profile and listing</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Profile skills: {profile.skills.length ? profile.skills.join(", ") : "none saved"}
                </p>
                <div className="mt-4">
                  <h4 className="text-xs font-medium text-emerald-300">Detected matches</h4>
                  <p className="mt-2 text-sm text-slate-300">
                    {selectedMatch.matching_skills.length
                      ? selectedMatch.matching_skills.join(", ")
                      : "No matching keyword evidence detected."}
                  </p>
                </div>
                <div className="mt-4">
                  <h4 className="text-xs font-medium text-amber-300">Potential gaps</h4>
                  <p className="mt-2 text-sm text-slate-300">
                    {selectedMatch.missing_skills.length
                      ? selectedMatch.missing_skills.join(", ")
                      : "No keyword gaps detected in the available description."}
                  </p>
                </div>
              </section>
              <section className="rounded-2xl border border-white/[0.07] bg-[#0c1423] p-5">
                <h3 className="font-semibold">Suggested activities</h3>
                {selectedMatch.missing_skills.length ? (
                  <ul className="mt-3 space-y-3">
                    {selectedMatch.missing_skills.map((skill) => (
                      <li key={skill} className="rounded-xl bg-white/[0.025] p-3">
                        <p className="text-sm font-medium">{skill}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-400">
                          {suggestionsFor(skill)} This skill appears in the selected listing.
                        </p>
                        <button
                          type="button"
                          onClick={() => void addSkillTask(skill)}
                          className="mt-3 text-xs font-semibold text-orange-300 hover:text-orange-200"
                        >
                          Add to career plan
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">
                    There are no detected skill gaps for this listing. A limited listing description can hide requirements.
                  </p>
                )}
              </section>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderCareerPlan() {
    const progress =
      roadmap.length === 0
        ? 0
        : Math.round((completedRoadmapCount / roadmap.length) * 100);

    return (
      <section className="rounded-2xl border border-white/[0.07] bg-[#0c1423] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-orange-300">
              <TrendingUp size={14} /> CAREER PLANNING AGENT
            </div>
            <h3 className="text-lg font-semibold">Your career roadmap</h3>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">
              Milestones use your saved interests and detected skill gaps. Edit the target or task list as your plans change.
            </p>
          </div>
          <span className="text-xs text-slate-400">
            {completedRoadmapCount}/{roadmap.length} completed
          </span>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="career-goal">
            Target career direction
          </label>
          <input
            id="career-goal"
            value={careerGoal}
            onChange={(event) => setCareerGoal(event.target.value)}
            maxLength={200}
            placeholder={profile.career_interests[0] || "Target role or career direction"}
            className="min-w-0 flex-1 rounded-xl border border-white/[0.1] bg-[#080e1a] px-4 py-3 text-sm"
          />
          <button
            type="button"
            onClick={() => void generateRoadmap()}
            disabled={roadmapLoading}
            className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold disabled:opacity-50"
          >
            {roadmapLoading ? "Saving roadmap..." : roadmap.length ? "Refresh roadmap" : "Create roadmap"}
          </button>
        </div>

        {roadmapMessage && (
          <p className="mt-3 text-xs text-emerald-300">{roadmapMessage}</p>
        )}
        {roadmapError && (
          <p className="mt-3 text-xs text-red-300">{roadmapError}</p>
        )}
        {roadmapLoading && roadmap.length === 0 && (
          <p className="mt-4 text-sm text-slate-400">Loading saved career milestones...</p>
        )}
        {roadmap.length > 0 && (
          <>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-orange-400"
                style={{ width: `${progress}%` }}
              />
            </div>
            <ol className="mt-5 space-y-3">
              {roadmap.map((task) => (
                <li key={task.task_id}>
                  <button
                    type="button"
                    onClick={() => void setRoadmapTask(task, !task.completed)}
                    className="flex w-full items-start gap-3 rounded-xl p-2 text-left hover:bg-white/[0.025]"
                  >
                    {task.completed ? (
                      <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-400" />
                    ) : (
                      <Circle size={18} className="mt-0.5 shrink-0 text-slate-600" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm ${task.completed ? "text-slate-500 line-through" : "text-slate-200"}`}>
                        {task.priority + 1}. {task.title}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">
                        {task.description}
                      </span>
                      <span className="mt-1 block text-[10px] uppercase tracking-wider text-orange-300/70">
                        {task.category}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </>
        )}
        {!roadmapLoading && roadmap.length === 0 && (
          <p className="mt-4 text-sm text-slate-400">
            No saved milestones yet. Create a plan to turn your career direction into practical steps.
          </p>
        )}
      </section>
    );
  }

  function renderResumeAgent() {
    return (
      <div className="space-y-6">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-orange-300">
            <Sparkles size={14} /> YOUR PERSONAL RESUME ASSISTANT
          </div>
          <h2 className="text-2xl font-semibold sm:text-3xl">
            Make your resume <span className="text-orange-400">work harder.</span>
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Upload your resume, discover your skills, compare it with a job
            description, and generate a downloadable PDF.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { title: "Upload", desc: "PDF, DOCX or TXT", icon: Upload },
            { title: "Analyse", desc: "Skills and sections", icon: BrainCircuit },
            { title: "Export", desc: "Download a PDF", icon: Download },
          ].map(({ title, desc, icon: Icon }, index) => (
            <div
              key={title}
              className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-[#0c1423] p-4"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-400/10 text-orange-300">
                <Icon size={19} />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {index + 1}. {title}
                </p>
                <p className="mt-1 text-xs text-slate-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <form
          onSubmit={analyzeResume}
          className="space-y-6 rounded-2xl border border-white/[0.07] bg-[#0c1423] p-5 sm:p-7"
        >
          <div>
            <h3 className="font-semibold">Upload your resume</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Files are sent to your local backend for processing. Maximum size: 5 MB.
            </p>
          </div>

          <label className="flex cursor-pointer flex-col items-center rounded-2xl border border-dashed border-orange-400/30 bg-orange-400/[0.035] px-5 py-9 text-center transition hover:bg-orange-400/[0.07]">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-400/10 text-orange-300">
              <Upload size={25} />
            </div>
            <span className="text-sm font-semibold">
              {resumeFile ? resumeFile.name : "Choose your resume"}
            </span>
            <span className="mt-2 text-xs text-slate-500">
              {resumeFile
                ? `${(resumeFile.size / 1024).toFixed(1)} KB · Click to replace`
                : "Click to browse PDF, DOCX or TXT files"}
            </span>
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={(event) =>
                handleFileChange(event.target.files?.[0] || null)
              }
            />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-medium text-slate-300">
                Target job title
              </label>
              <input
                value={jobTitle}
                onChange={(event) => setJobTitle(event.target.value)}
                placeholder="e.g. Software Developer Intern"
                className="w-full rounded-xl border border-white/[0.09] bg-[#080e1a] px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-orange-400/50"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-slate-300">
                Job description (optional)
              </label>
              <p className="mb-2 text-[10px] text-slate-500">
                Paste the role&apos;s requirements to compare skills.
              </p>
              <textarea
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                placeholder="Required skills, qualifications, responsibilities..."
                rows={4}
                className="w-full resize-y rounded-xl border border-white/[0.09] bg-[#080e1a] px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-orange-400/50"
              />
            </div>
          </div>

          {resumeError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-400/[0.06] p-3 text-sm text-red-300">
              <AlertCircle size={17} className="mt-0.5 shrink-0" />
              <span>{resumeError}</span>
            </div>
          )}

          {resumeMessage && (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3 text-sm text-emerald-300">
              <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
              <span>{resumeMessage}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={resumeLoading || !resumeFile}
              className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {resumeLoading ? (
                <RefreshCw size={17} className="animate-spin" />
              ) : (
                <BrainCircuit size={17} />
              )}
              {resumeLoading ? "Analysing..." : "Analyse resume"}
            </button>

            <button
              type="button"
              onClick={generateResume}
              disabled={pdfLoading || !resumeFile}
              className="flex items-center gap-2 rounded-xl border border-white/[0.1] px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pdfLoading ? (
                <RefreshCw size={17} className="animate-spin" />
              ) : (
                <Download size={17} />
              )}
              {pdfLoading ? "Generating..." : "Generate PDF"}
            </button>
          </div>
        </form>

        {analysis && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-emerald-400/15 bg-[#0c1423] p-5 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-emerald-300">
                    <FileCheck size={19} />
                    <h3 className="font-semibold">Analysis complete</h3>
                  </div>
                  <p className="mt-2 break-all text-xs text-slate-500">
                    {analysis.filename}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-400/10 px-4 py-3 text-center">
                  <p className="text-2xl font-bold text-emerald-300">
                    {analysis.skills_count}
                  </p>
                  <p className="text-[10px] text-slate-400">Skills detected</p>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="mb-3 text-sm font-semibold">Skills found</h4>
                {analysis.skills_found.length ? (
                  <div className="flex flex-wrap gap-2">
                    {analysis.skills_found.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-slate-200"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    No recognised skills were found.
                  </p>
                )}
              </div>

              <div className="mt-6">
                <h4 className="mb-3 text-sm font-semibold">
                  Sections detected
                </h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.sections_detected.map((section) => (
                    <span
                      key={section}
                      className="rounded-lg bg-emerald-400/[0.07] px-3 py-1.5 text-xs capitalize text-emerald-300"
                    >
                      <CheckCircle2 size={12} className="mr-1 inline" />
                      {section}
                    </span>
                  ))}
                </div>
              </div>

              {jobDescription.trim() && (
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-emerald-300">
                      Matching skills ({analysis.matching_skills.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.matching_skills.length ? (
                        analysis.matching_skills.map((skill) => (
                          <span
                            key={skill}
                            className="rounded-lg bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-300"
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500">
                          No keyword matches detected.
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-orange-300">
                      Skills to review ({analysis.potential_skill_gaps.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.potential_skill_gaps.length ? (
                        analysis.potential_skill_gaps.map((skill) => (
                          <span
                            key={skill}
                            className="rounded-lg bg-orange-400/10 px-3 py-1.5 text-xs text-orange-300"
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500">
                          No additional recognised keywords identified.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <p className="mt-6 rounded-xl bg-white/[0.035] p-3 text-xs leading-5 text-slate-400">
                {analysis.note}
              </p>
            </div>

            <div className="rounded-2xl border border-orange-400/15 bg-orange-400/[0.035] p-5">
              <div className="flex items-start gap-3">
                <GraduationCap size={22} className="shrink-0 text-orange-300" />
                <div>
                  <h3 className="text-sm font-semibold">Your next step</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Review the detected skills and any suggested gaps. Only
                    include skills and experience that accurately reflect your
                    abilities. Generate a PDF when you&apos;re ready.
                  </p>
                  <button
                    onClick={generateResume}
                    disabled={pdfLoading || !resumeFile}
                    className="mt-4 flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-semibold text-white hover:bg-orange-400 disabled:opacity-50"
                  >
                    <Download size={15} />
                    {pdfLoading ? "Generating PDF..." : "Download tailored PDF"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <p className="text-[10px] leading-5 text-slate-600">
          Current version: keyword-based analysis. PDF generation formats the
          original resume and adds relevant skill information; it does not yet
          use an AI model to rewrite your experience. Your uploaded resume is
          processed by the backend and is not saved permanently by these
          endpoints.
        </p>
      </div>
    );
  }

  function renderJobs() {
    const visibleJobs = jobs
      .map((job, index) => ({ job, index }))
      .filter(({ job }) => {
      if (remoteOnly && !job.job_is_remote) return false;
      if (
        employmentFilter !== "All" &&
        (job.job_employment_type || "").toLowerCase() !== employmentFilter.toLowerCase()
      ) {
        return false;
      }
      return true;
      });

    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold sm:text-3xl">
            Discover your <span className="text-orange-400">next opportunity.</span>
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Search real job listings using JSearch.
          </p>
        </div>

        {applicationsError && (
          <div className="rounded-xl border border-red-400/20 bg-red-400/[0.06] p-4 text-sm text-red-300">
            {applicationsError}
          </div>
        )}
        {matchError && (
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-sm text-amber-200">
            Match scoring is unavailable: {matchError}
          </div>
        )}

        <form onSubmit={submitJobSearch} className="flex gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/[0.08] bg-[#0c1423] px-4">
            <Search size={17} className="shrink-0 text-slate-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="e.g. data analyst jobs in India"
              className="w-full bg-transparent py-4 text-sm outline-none placeholder:text-slate-600"
            />
          </div>
          <button className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold hover:bg-orange-400 sm:px-6">
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-white/[0.07] bg-[#0c1423] px-4 py-3">
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={remoteOnly}
              onChange={(event) => setRemoteOnly(event.target.checked)}
              className="accent-orange-500"
            />
            Remote only
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            Employment type
            <select
              value={employmentFilter}
              onChange={(event) => setEmploymentFilter(event.target.value)}
              className="rounded-lg border border-white/[0.1] bg-[#080e1a] px-3 py-2 text-slate-200"
            >
              {[
                "All",
                ...Array.from(
                  new Set(
                    jobs
                      .map((job) => job.job_employment_type)
                      .filter((type): type is string => Boolean(type))
                  )
                ),
              ].map((type) => (
                <option key={type} value={type}>
                  {type === "All" ? "All types" : type.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
        </div>

        {jobsLoading && (
          <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-[#0c1423] p-8 text-sm text-slate-400">
            <RefreshCw size={18} className="animate-spin" />
            Loading jobs...
          </div>
        )}

        {jobsError && (
          <div className="rounded-xl border border-red-400/20 bg-red-400/[0.06] p-4 text-sm text-red-300">
            {jobsError}
          </div>
        )}

        {!jobsLoading && !jobsError && jobs.length === 0 && (
          <div className="rounded-2xl border border-white/[0.07] bg-[#0c1423] p-8 text-sm text-slate-400">
            No listings found. Try a different job title or location.
          </div>
        )}

        {!jobsLoading && !jobsError && jobs.length > 0 && visibleJobs.length === 0 && (
          <div className="rounded-2xl border border-white/[0.07] bg-[#0c1423] p-8 text-sm text-slate-400">
            No listings match these filters. Adjust the remote or employment-type filters.
          </div>
        )}

        {!jobsLoading &&
          visibleJobs.map(({ job, index }) => {
            const id = opportunityId(job, index);
            const tracked = applications.find(
              (application) => application.opportunity_id === id
            );
            const match = matchScores[id];
            const location = [
              job.job_city,
              job.job_state,
              job.job_country,
            ].filter(Boolean).join(", ");
            const closingDate = localDateFromTimestamp(
              job.job_offer_expiration_datetime_utc
            );
            const salary =
              job.job_min_salary != null && job.job_max_salary != null
                ? `${job.job_salary_currency || ""} ${job.job_min_salary.toLocaleString()}–${job.job_max_salary.toLocaleString()}${job.job_salary_period ? ` / ${job.job_salary_period}` : ""}`.trim()
                : "";

            return (
              <article
                key={id}
                className="rounded-2xl border border-white/[0.07] bg-[#0c1423] p-5 sm:p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.035]">
                    {job.employer_logo ? (
                      <Image
                        src={job.employer_logo}
                        alt=""
                        width={48}
                        height={48}
                        unoptimized
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <BriefcaseBusiness size={20} className="text-orange-300" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold">
                      {job.job_title || "Untitled position"}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      {job.employer_name || "Company not listed"}
                    </p>
                    {match && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-orange-400/10 px-2 py-1 text-[10px] text-orange-200">
                          {match.score === null ? "Match unavailable" : `${match.score}% profile match`}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSkillJob(id);
                            choosePage("Skill Analysis");
                          }}
                          className="text-[10px] text-orange-300 underline"
                        >
                          View match reasons and skill gaps
                        </button>
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-400">
                      {location && (
                        <span className="flex items-center gap-1 rounded-md bg-white/[0.04] px-2 py-1">
                          <MapPin size={11} /> {location}
                        </span>
                      )}
                      {job.job_is_remote && (
                        <span className="rounded-md bg-emerald-400/10 px-2 py-1 text-emerald-300">
                          Remote
                        </span>
                      )}
                      {job.job_employment_type && (
                        <span className="rounded-md bg-white/[0.04] px-2 py-1">
                          {job.job_employment_type.replaceAll("_", " ")}
                        </span>
                      )}
                      {salary && (
                        <span className="rounded-md bg-white/[0.04] px-2 py-1">
                          {salary}
                        </span>
                      )}
                      {closingDate && (
                        <span className="rounded-md bg-amber-400/10 px-2 py-1 text-amber-200">
                          Listing closes {new Date(`${closingDate}T12:00:00`).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {job.job_description && (
                      <p className="mt-3 text-xs leading-5 text-slate-400">
                        {job.job_description.slice(0, 260)}
                        {job.job_description.length > 260 ? "…" : ""}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-[11px] text-slate-500">
                        <Clock3 size={12} className="mr-1 inline" />
                        {job.job_posted_at || "Job listing"}
                      </span>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={applicationBusy}
                          onClick={() => void toggleSaved(id, job)}
                          aria-label={tracked ? "Open saved opportunity in tracker" : "Save opportunity"}
                          title={tracked ? `Tracked as ${tracked.status}` : "Save opportunity"}
                          className={`rounded-lg border p-2 ${
                            tracked
                              ? "border-orange-400/30 text-orange-300"
                              : "border-white/[0.08] text-slate-400"
                          } disabled:opacity-50`}
                        >
                          <Bookmark
                            size={15}
                            fill={tracked ? "currentColor" : "none"}
                          />
                        </button>

                        {job.job_apply_link && (
                          <>
                            <a
                              href={job.job_apply_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-400"
                            >
                              Apply Now <ArrowUpRight size={13} />
                            </a>
                            {tracked?.status !== "Applied" &&
                              tracked?.status !== "Interview" &&
                              tracked?.status !== "Offer" &&
                              tracked?.status !== "Rejected" && (
                                <button
                                  type="button"
                                  disabled={applicationBusy}
                                  onClick={() =>
                                    void trackOpportunity(
                                      job,
                                      id,
                                      "Applied",
                                      localDateString()
                                    )
                                  }
                                  className="rounded-lg border border-white/[0.1] px-3 py-2 text-xs text-slate-200 disabled:opacity-50"
                                >
                                  Mark applied
                                </button>
                              )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#080e1a] text-slate-100">
      <div className="flex min-h-screen">
        {menuOpen && (
          <button
            aria-label="Close navigation"
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setMenuOpen(false)}
          />
        )}

        <aside
          className={`${
            menuOpen ? "translate-x-0" : "-translate-x-full"
          } fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/[0.07] bg-[#0b1220] transition-transform duration-200 lg:static lg:translate-x-0`}
        >
          <div className="flex h-[76px] items-center gap-3 border-b border-white/[0.07] px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500">
              <Sparkles size={22} />
            </div>
            <div>
              <div className="text-lg font-bold">
                Opportunity<span className="text-orange-400">OS</span>
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                Career intelligence
              </div>
            </div>
            <button
              className="ml-auto lg:hidden"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-4 pt-7">
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Workspace
            </p>
            <nav className="space-y-1">
              {navigation.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  onClick={() => choosePage(label)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm ${
                    active === label
                      ? "border border-orange-400/15 bg-orange-500/10 text-orange-300"
                      : "text-slate-400 hover:bg-white/[0.04]"
                  }`}
                >
                  <Icon size={18} />
                  {label}
                  {label === "Applications" && (
                    <span className="ml-auto rounded-md bg-white/[0.06] px-2 py-0.5 text-xs">
                          {applications.length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="mt-auto p-4">
            <div className="rounded-2xl border border-orange-400/15 bg-orange-500/[0.07] p-4">
              <Sparkles size={19} className="mb-3 text-orange-300" />
              <p className="text-sm font-semibold">Your next opportunity awaits</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                Use the Resume Agent to review your skills.
              </p>
              <button
                onClick={() => choosePage("Resume Agent")}
                className="mt-4 flex items-center gap-2 text-xs font-semibold text-orange-300"
              >
                Open Resume Agent <ChevronRight size={14} />
              </button>
            </div>
            <div className="mt-5 border-t border-white/[0.07] pt-4">
              <p className="text-sm font-medium">Student Workspace</p>
              <p className="mt-1 text-xs text-slate-500">OpportunityOS prototype</p>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex min-h-[76px] flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] bg-[#080e1a]/95 px-5 py-3 backdrop-blur-xl sm:px-8">
            <div className="flex items-center gap-3">
              <button
                aria-label="Open navigation"
                onClick={() => setMenuOpen(true)}
                className="rounded-lg p-2 text-slate-400 lg:hidden"
              >
                <Menu size={21} />
              </button>
              <div>
                <p className="text-xs text-slate-500">Workspace / {active}</p>
                <h1 className="mt-1 text-lg font-semibold sm:text-xl">
                  {active === "Overview" ? "Student Dashboard" : active}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {active !== "Resume Agent" && (
                <form
                  onSubmit={submitJobSearch}
                  className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2"
                >
                  <Search size={15} className="text-slate-500" />
                  <input
                    aria-label="Search jobs"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search jobs..."
                    className="w-32 bg-transparent text-xs outline-none sm:w-44"
                  />
                  <button aria-label="Submit job search" type="submit">
                    <ArrowUpRight size={15} className="text-orange-300" />
                  </button>
                </form>
              )}
              <button
                aria-label="Notifications"
                onClick={() => choosePage("Deadlines")}
                className="rounded-xl border border-white/[0.08] p-2.5 text-slate-400"
              >
                <Bell size={18} />
              </button>
            </div>
          </header>

          <div className="mx-auto max-w-[1600px] p-5 sm:p-8">
            {notice && (
              <div className="mb-5 flex justify-between gap-3 rounded-xl border border-orange-400/20 bg-orange-400/[0.06] p-4 text-sm text-orange-200">
                <span>{notice}</span>
                <button aria-label="Dismiss notice" onClick={() => setNotice("")}>
                  <X size={16} />
                </button>
              </div>
            )}

            {active === "Resume Agent" ? (
              renderResumeAgent()
            ) : active === "Discover" ? (
              renderJobs()
            ) : active === "My Profile" ? (
              renderProfileAgent()
            ) : active === "Applications" ? (
              renderApplications()
            ) : active === "Deadlines" ? (
              renderDeadlines()
            ) : active === "Skill Analysis" ? (
              renderSkillAnalysis()
            ) : active === "Overview" ? (
              <div className="space-y-8">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-xs font-medium text-orange-300">
                      <Sparkles size={14} /> YOUR CAREER, INTELLIGENTLY ORGANIZED
                    </div>
                    <h2 className="text-2xl font-semibold sm:text-3xl">
                      Let&apos;s find your{" "}
                      <span className="text-orange-400">next big thing.</span>
                    </h2>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                      Track real opportunities, application progress, deadlines, and career milestones.
                    </p>
                  </div>
                  <button
                    onClick={() => choosePage("Discover")}
                    className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold hover:bg-orange-400"
                  >
                    <Compass size={17} /> Explore opportunities <ArrowUpRight size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    { label: "Profile completeness", value: `${profileCompletion}%`, icon: UserRound },
                    { label: "Saved opportunities", value: String(savedCount), icon: Bookmark },
                    { label: "Non-saved applications", value: String(activeApplicationCount), icon: BriefcaseBusiness },
                    { label: "Deadlines due in 7 days", value: String(dueSoonCount), icon: CalendarDays },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="rounded-2xl border border-white/[0.07] bg-[#0c1423] p-5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">{label}</span>
                        <Icon size={19} className="text-orange-300" />
                      </div>
                      <p className="mt-4 text-3xl font-semibold">{value}</p>
                    </div>
                  ))}
                </div>

                {applicationsError && (
                  <p className="text-sm text-red-300">{applicationsError}</p>
                )}
                {profileError && (
                  <p className="text-sm text-red-300">{profileError}</p>
                )}
                {deadlinesError && (
                  <p className="text-sm text-red-300">{deadlinesError}</p>
                )}
                {matchError && (
                  <p className="text-sm text-red-300">{matchError}</p>
                )}

                <div className="grid gap-6 xl:grid-cols-2">
                  <section className="rounded-2xl border border-white/[0.07] bg-[#0c1423] p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">Recommended live opportunities</h3>
                        <p className="mt-1 text-xs text-slate-500">
                          Ranked by the explainable profile match heuristic
                        </p>
                      </div>
                      <button
                        onClick={() => choosePage("Discover")}
                        className="text-xs text-orange-300"
                      >
                        View all <ChevronRight size={14} className="inline" />
                      </button>
                    </div>
                    {jobsLoading && (
                      <p className="mt-5 text-sm text-slate-400">Loading JSearch listings...</p>
                    )}
                    {jobsError && (
                      <p className="mt-5 text-sm text-red-300">{jobsError}</p>
                    )}
                    {!jobsLoading && !jobsError && jobs.length === 0 && (
                      <p className="mt-5 text-sm text-slate-400">
                        No live opportunities are available for this search yet.
                      </p>
                    )}
                    {[...jobs]
                      .sort((first, second) => {
                        const firstId = opportunityId(first, jobs.indexOf(first));
                        const secondId = opportunityId(second, jobs.indexOf(second));
                        return (
                          (matchScores[secondId]?.score ?? -1) -
                          (matchScores[firstId]?.score ?? -1)
                        );
                      })
                      .slice(0, 4)
                      .map((job, index) => {
                        const id = opportunityId(job, jobs.indexOf(job));
                        const match = matchScores[id];
                        return (
                          <div
                            key={`${id}-${index}`}
                            className="flex items-center justify-between gap-3 border-b border-white/[0.05] py-4 last:border-0"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {job.job_title || "Untitled position"}
                              </p>
                              <p className="mt-1 truncate text-xs text-slate-400">
                                {job.employer_name || "Company not listed"}
                              </p>
                            </div>
                            <span className="shrink-0 text-xs text-orange-300">
                              {match?.score === null || match?.score === undefined
                                ? "No score"
                                : `${match.score}% match`}
                            </span>
                          </div>
                        );
                      })}
                  </section>

                  <section className="rounded-2xl border border-white/[0.07] bg-[#0c1423] p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">Upcoming actions</h3>
                        <p className="mt-1 text-xs text-slate-500">
                          Confirmed dates and your own reminders
                        </p>
                      </div>
                      <button
                        onClick={() => choosePage("Deadlines")}
                        className="text-xs text-orange-300"
                      >
                        Manage <ChevronRight size={14} className="inline" />
                      </button>
                    </div>
                    {deadlines
                      .filter((deadline) => !deadline.completed)
                      .slice(0, 4)
                      .map((deadline) => (
                        <div key={`${deadline.kind}-${deadline.id}`} className="border-b border-white/[0.05] py-4 last:border-0">
                          <p className="text-sm font-medium">{deadline.title}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {deadline.due_date
                              ? new Date(`${deadline.due_date}T12:00:00`).toLocaleDateString()
                              : "No date provided"}
                            {" · "}
                            {deadline.source || "Source not provided"}
                          </p>
                        </div>
                      ))}
                    {deadlines.filter((deadline) => !deadline.completed).length === 0 && (
                      <p className="mt-5 text-sm text-slate-400">
                        No upcoming actions yet. Add confirmed dates or reminders in Deadlines.
                      </p>
                    )}
                  </section>
                </div>

                <section className="rounded-2xl border border-white/[0.07] bg-[#0c1423] p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">Applications by status</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Counts from your saved application tracker
                      </p>
                    </div>
                    <button
                      onClick={() => choosePage("Applications")}
                      className="text-xs text-orange-300"
                    >
                      Manage applications <ChevronRight size={14} className="inline" />
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                    {(
                      ["Saved", "Applied", "Interview", "Offer", "Rejected"] as const
                    ).map((status) => (
                      <div
                        key={status}
                        className="rounded-xl bg-white/[0.025] p-3"
                      >
                        <p className="text-xs text-slate-400">{status}</p>
                        <p className="mt-2 text-xl font-semibold">
                          {applications.filter((item) => item.status === status).length}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                <div className="grid gap-6 xl:grid-cols-2">
                  {renderCareerPlan()}
                  <section className="rounded-2xl border border-white/[0.07] bg-[#0c1423] p-5 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Resume Agent</h3>
                        <p className="mt-1 text-xs text-slate-500">
                          Keyword-based analysis and PDF export
                        </p>
                      </div>
                      <FileText size={22} className="text-orange-300" />
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-400">
                      Compare a resume with a selected job description. The analysis is keyword-based, not an AI assessment.
                    </p>
                    <button
                      onClick={() => choosePage("Resume Agent")}
                      className="mt-5 flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold hover:bg-orange-400"
                    >
                      Open Resume Agent <ArrowUpRight size={15} />
                    </button>
                  </section>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/[0.07] bg-[#0c1423] p-8">
                <h2 className="text-xl font-semibold">{active}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Settings are not available in this development workspace.
                </p>
              </div>
            )}

            <footer className="mt-10 flex flex-col gap-2 border-t border-white/[0.06] pt-5 text-[10px] text-slate-600 sm:flex-row sm:justify-between">
              <span>OpportunityOS · AI-Powered Student Opportunity & Career Agent</span>
              <span>Live job search · Resume analysis · PDF export</span>
            </footer>
          </div>
        </section>
      </div>
    </main>
  );
}
