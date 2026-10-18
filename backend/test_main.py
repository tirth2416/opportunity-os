import atexit
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch


_test_database_dir = tempfile.TemporaryDirectory(prefix="opportunityos-tests-")
atexit.register(_test_database_dir.cleanup)
os.environ["DATABASE_PATH"] = str(Path(_test_database_dir.name) / "startup.db")

import main
from fastapi.testclient import TestClient


class OpportunityOSTestCase(unittest.TestCase):
    def setUp(self):
        self.database_path = Path(_test_database_dir.name) / (
            f"{self.id().split('.')[-1]}.db"
        )
        main.PROFILE_DB = self.database_path
        main.init_profile_db()
        self.client = TestClient(main.app)
        self.user_id = "student-test"

    def tearDown(self):
        self.client.close()
        self.database_path.unlink(missing_ok=True)

    def test_health_and_job_search_with_provider_response(self):
        self.assertEqual(self.client.get("/health").json(), {"status": "ok"})

        provider_response = Mock()
        provider_response.json.return_value = {
            "status": "OK",
            "data": [{"job_id": "listing-1", "job_title": "Python Developer"}],
        }
        with patch.object(main.requests, "get", return_value=provider_response) as get:
            response = self.client.get("/jobs", params={"query": "python developer"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["count"], 1)
        self.assertEqual(response.json()["jobs"][0]["job_id"], "listing-1")
        self.assertEqual(get.call_args.kwargs["timeout"], 30)

    def test_profile_save_and_reload(self):
        profile = {
            "user_id": self.user_id,
            "full_name": "Test Student",
            "email": "student@example.com",
            "education": "B.Tech",
            "university": "Example University",
            "graduation_year": 2027,
            "skills": ["Python", "SQL"],
            "projects": ["Portfolio"],
            "experience": "",
            "career_interests": ["Software Development"],
            "preferred_locations": ["Remote"],
            "opportunity_types": ["Internship"],
        }
        saved = self.client.post("/profile", json=profile)
        self.assertEqual(saved.status_code, 200)
        loaded = self.client.get(f"/profile/{self.user_id}")
        self.assertEqual(loaded.status_code, 200)
        self.assertEqual(loaded.json()["skills"], ["Python", "SQL"])
        self.assertEqual(loaded.json()["graduation_year"], 2027)

    def test_resume_keyword_analysis_and_pdf_generation(self):
        resume = (
            b"Education: Bachelor of Science\nExperience: Python developer\n"
            b"Skills: Python, SQL, React. Projects: Student opportunity app."
        )
        analyzed = self.client.post(
            "/resume/analyze",
            files={"file": ("resume.txt", resume, "text/plain")},
            data={"job_description": "Python and SQL developer role"},
        )
        self.assertEqual(analyzed.status_code, 200)
        self.assertIn("Python", analyzed.json()["matching_skills"])
        self.assertIn("SQL", analyzed.json()["matching_skills"])
        self.assertIn("keyword-based", analyzed.json()["note"])

        generated = self.client.post(
            "/resume/generate",
            files={"file": ("resume.txt", resume, "text/plain")},
            data={"job_title": "Python Developer"},
        )
        self.assertEqual(generated.status_code, 200)
        self.assertEqual(generated.headers["content-type"], "application/pdf")
        self.assertTrue(generated.content.startswith(b"%PDF"))

    def test_application_upsert_edit_list_and_delete(self):
        application = {
            "user_id": self.user_id,
            "opportunity_id": "listing-1",
            "job_title": "Python Developer",
            "employer_name": "Example Co",
            "job_url": "https://jobs.example/listing-1",
            "status": "Saved",
            "notes": "",
            "application_date": None,
            "follow_up_date": None,
            "application_deadline_date": "2027-01-20",
            "deadline_source": "https://jobs.example/listing-1",
        }
        created = self.client.post("/applications", json=application)
        self.assertEqual(created.status_code, 200)
        application_id = created.json()["id"]

        application["status"] = "Applied"
        application["application_date"] = "2026-10-18"
        duplicate = self.client.post("/applications", json=application)
        self.assertEqual(duplicate.status_code, 200)
        self.assertEqual(duplicate.json()["id"], application_id)
        self.assertEqual(len(self.client.get(f"/applications/{self.user_id}").json()), 1)

        application["status"] = "Interview"
        application["notes"] = "Interview scheduled"
        application["follow_up_date"] = "2026-10-25"
        updated = self.client.put(
            f"/applications/{application_id}", json=application
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["status"], "Interview")
        self.assertEqual(updated.json()["notes"], "Interview scheduled")

        deleted = self.client.delete(
            f"/applications/{application_id}",
            params={"user_id": self.user_id},
        )
        self.assertEqual(deleted.status_code, 200)
        self.assertEqual(self.client.get(f"/applications/{self.user_id}").json(), [])

    def test_deadlines_keep_unknown_dates_and_application_followups(self):
        unknown = self.client.post(
            "/deadlines",
            json={
                "user_id": self.user_id,
                "title": "Confirm application closing date",
                "source": "",
            },
        )
        self.assertEqual(unknown.status_code, 200)
        self.assertIsNone(unknown.json()["due_date"])

        overdue = self.client.post(
            "/deadlines",
            json={
                "user_id": self.user_id,
                "title": "Past reminder",
                "due_date": "2020-01-01",
                "source": "Test source",
            },
        )
        item_id = overdue.json()["id"]
        completed = self.client.patch(
            f"/deadlines/{item_id}",
            json={"user_id": self.user_id, "completed": True},
        )
        self.assertTrue(completed.json()["completed"])

        self.client.post(
            "/applications",
            json={
                "user_id": self.user_id,
                "opportunity_id": "listing-follow-up",
                "job_title": "Analyst",
                "follow_up_date": "2026-10-25",
                "application_deadline_date": "2026-11-01",
                "deadline_source": "https://jobs.example/analyst",
            },
        )
        actions = self.client.get(f"/deadlines/{self.user_id}").json()
        application_actions = [
            action for action in actions if action["kind"] != "deadline"
        ]
        self.assertEqual(
            {action["kind"] for action in application_actions},
            {"follow-up", "application-deadline"},
        )
        follow_up = next(
            action for action in application_actions if action["kind"] == "follow-up"
        )
        done = self.client.patch(
            f"/deadlines/{follow_up['id']}",
            json={"user_id": self.user_id, "completed": True},
        )
        self.assertTrue(done.json()["completed"])
        application_deadline = next(
            action
            for action in application_actions
            if action["kind"] == "application-deadline"
        )
        closing_date_done = self.client.patch(
            f"/deadlines/{application_deadline['id']}",
            json={"user_id": self.user_id, "completed": True},
        )
        self.assertTrue(closing_date_done.json()["completed"])

    def test_roadmap_progress_persists(self):
        task = {
            "user_id": self.user_id,
            "task_id": "build-project",
            "title": "Build a portfolio project",
            "description": "Demonstrate project skills.",
            "category": "Project",
            "priority": 1,
            "completed": False,
        }
        self.assertEqual(self.client.post("/roadmap", json=task).status_code, 200)
        saved = self.client.get(f"/roadmap/{self.user_id}").json()
        self.assertEqual(len(saved), 1)
        completed = self.client.patch(
            "/roadmap/build-project",
            json={"user_id": self.user_id, "completed": True},
        )
        self.assertTrue(completed.json()["completed"])
        task["title"] = "Updated project milestone"
        self.client.post("/roadmap", json=task)
        self.assertTrue(self.client.get(f"/roadmap/{self.user_id}").json()[0]["completed"])
        self.assertEqual(
            self.client.get(f"/roadmap/{self.user_id}").json()[0]["title"],
            "Updated project milestone",
        )

    def test_match_score_is_explainable_and_missing_data_is_unscored(self):
        profile = {
            "user_id": self.user_id,
            "education": "B.Tech Computer Science",
            "skills": ["Python", "SQL"],
            "career_interests": ["Software Development"],
            "preferred_locations": ["Remote"],
            "opportunity_types": ["Internship"],
        }
        opportunity = {
            "job_title": "Software Development Intern",
            "job_description": "Bachelor degree preferred. Python, SQL, and React.",
            "job_is_remote": True,
            "job_employment_type": "INTERNSHIP",
        }
        response = self.client.post(
            "/matching/score",
            json={"profile": profile, "opportunity": opportunity},
        )
        self.assertEqual(response.status_code, 200)
        self.assertGreater(response.json()["score"], 0)
        self.assertEqual(response.json()["matching_skills"], ["Python", "SQL"])
        self.assertEqual(response.json()["missing_skills"], ["React"])
        self.assertTrue(response.json()["reasons"])

        batch = self.client.post(
            "/matching/scores",
            json={
                "profile": profile,
                "opportunities": [
                    {"job_id": "listing-batch", **opportunity}
                ],
            },
        )
        self.assertEqual(batch.status_code, 200)
        self.assertEqual(batch.json()[0]["opportunity_id"], "listing-batch")

        blank = self.client.post(
            "/matching/score",
            json={
                "profile": {"user_id": self.user_id},
                "opportunity": {},
            },
        )
        self.assertEqual(blank.status_code, 200)
        self.assertIsNone(blank.json()["score"])

    def test_invalid_application_status_is_rejected(self):
        response = self.client.post(
            "/applications",
            json={
                "user_id": self.user_id,
                "opportunity_id": "bad",
                "job_title": "Bad status",
                "status": "Maybe",
            },
        )
        self.assertEqual(response.status_code, 422)

    def test_application_url_must_be_http_or_https(self):
        response = self.client.post(
            "/applications",
            json={
                "user_id": self.user_id,
                "opportunity_id": "bad-url",
                "job_title": "Untrusted listing",
                "job_url": "javascript:alert(1)",
            },
        )
        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
