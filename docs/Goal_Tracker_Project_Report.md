# Goal Tracker Application - Comprehensive Project Report

**Date:** 2026-02-19  
**Prepared For:** Academic / Professional Project Submission  
**Prepared By:** Project Team

## Table of Contents
- Executive Summary
- 1. Project Overview
- 2. Problem Statement and Proposed Solution
- 3. Objectives and Scope
- 4. Technology Stack
- 5. System Architecture
- 6. Module-Level Design
- 7. Data Model
- 8. API Design and Endpoint Documentation
- 9. Frontend Implementation Details
- 10. Backend Implementation Details
- 11. Security, Performance, and Reliability Considerations
- 12. Testing Strategy Recommendation
- 13. Deployment and Operations Notes
- 14. Future Roadmap
- 15. Conclusion
- Appendix A. Repository Structure
- Appendix B. Source Code Listings

---

## Executive Summary

This report presents a complete technical and functional analysis of the Goal Tracker application. The app is a full-stack productivity platform that helps users define goals, execute daily tasks, and monitor progress through a real-time dashboard. The frontend is implemented with React and Vite, while the backend uses Express and MongoDB through Mongoose.

The report covers project objectives, architecture, data model, API design, frontend structure, backend workflow, technology stack rationale, deployment concerns, quality attributes, future improvements, and a rich appendix of source code excerpts for learning and maintainability.

Because this report is intended as an academic/professional project document, it is structured for 20-30 pages in a Word-compatible format. The writing includes both high-level narrative and low-level implementation details so that readers from both management and engineering backgrounds can understand the system.

## 1. Project Overview

The Goal Tracker project is designed as a daily productivity workspace for personal users. It is centered on a simple flow:
1) capture goals,
2) break them into actionable tasks,
3) track completion,
4) review progress over time.

The system is intentionally minimal yet complete. It includes user-oriented features such as welcoming onboarding, route-based dashboard pages, cards for key metrics, trend charts, and focused list interfaces for goals and todos.

Unlike many tutorial-grade projects that only demonstrate CRUD operations, this application introduces an integrated experience where backend analytics endpoints are consumed by frontend visualizations to close the feedback loop for users.

## 2. Problem Statement and Proposed Solution

Modern students, professionals, and creators usually face the same execution gap: they know what they want to achieve, but they do not have a simple, low-friction system that keeps goals and tasks connected in one workflow.

Most users either rely on plain to-do lists that lack strategic context, or they use complex project management tools that are too heavy for personal productivity. This application addresses the middle ground. It combines higher-level goal planning and day-level task execution in a single dashboard.

The problem solved by the project can be framed in five concrete pain points:

1. Fragmented planning systems: goals are captured in one place while tasks are tracked in another, leading to context switching and weak follow-through.
2. Lack of progress visibility: users can add tasks but cannot easily evaluate whether they are progressing toward meaningful outcomes.
3. Weak motivation loops: in the absence of visual progress analytics, users struggle to maintain momentum over multiple days.
4. High setup overhead in enterprise tools: many productivity platforms require complex onboarding and configurations that discourage routine use.
5. Inconsistent habit reinforcement: users need immediate feedback (completed goals, pending tasks, activity trend) to sustain daily discipline.

The Goal Tracker App solves these issues by unifying:
- Goal lifecycle management (create, update, complete, delete)
- Daily task management (quick add, check-off, delete)
- Dashboard analytics (goal completion, pending tasks, seven-day trend)
- Lightweight onboarding through username persistence in local storage

In practical terms, this project offers a focused personal command center: the user can set long-term intent and execute short-term action without leaving the application.

## 3. Objectives and Scope

Primary objectives:
- Deliver a full-stack web app for personal productivity management.
- Provide clear separation of concerns between frontend views and backend API logic.
- Persist data in a durable, queryable store (MongoDB).
- Offer actionable analytics via dashboard statistics and history.
- Keep onboarding friction low via local username persistence.

Scope included in the project:
- Goal management module.
- Todo management module.
- Dashboard overview with trend chart and progress indicators.
- REST APIs for CRUD and analytics.
- Responsive and modern user interface.

Scope intentionally excluded (for future releases):
- Multi-user authentication and authorization.
- Role-based permissions.
- Team collaboration features.
- Notification scheduling engine.
- Offline-first synchronization.

## 4. Technology Stack

Frontend:
- React 19 for component-based UI architecture.
- React Router for page routing and nested layouts.
- Recharts for analytics visualization.
- Tailwind CSS utility-driven styling and UI consistency.
- Lucide React iconography for modern visual semantics.
- Vite for rapid development server and optimized build output.

Backend:
- Node.js runtime for JavaScript-based server execution.
- Express 5 for HTTP APIs and middleware control.
- Mongoose for schema definitions, validation, and MongoDB access.
- CORS middleware for browser compatibility.
- dotenv for environment-based configuration.

Database:
- MongoDB for flexible document persistence of goals and tasks.

Developer Tooling:
- ESLint for linting.
- PostCSS + Tailwind plugins for CSS processing.
- npm scripts for build/start/dev lifecycle automation.

## 5. System Architecture

The architecture follows a classic client-server model:

- Client Layer (React): renders pages, fetches API data, handles user interactions.
- API Layer (Express): validates request context, performs business logic, returns JSON responses.
- Data Layer (MongoDB via Mongoose): stores goals and todos with timestamp metadata.

Data flow example for dashboard:
1) DashboardOverview page mounts and reads current username.
2) It requests /api/dashboard/stats and /api/dashboard/history.
3) Server aggregates counts and computes 7-day activity snapshots.
4) Frontend updates state and renders cards + area chart.

This flow demonstrates a clean boundary: presentation logic remains on frontend, while aggregation and persistence logic live in backend routes.

## 6. Module-Level Design

A. Landing and Navigation Module
- Landing page introduces the product value proposition.
- Navbar/Hero components emphasize accessibility and visual clarity.

B. Dashboard Shell Module
- Dashboard layout hosts Sidebar + Header + nested content.
- User onboarding modal appears when username is unavailable.
- Username is persisted in localStorage for session continuity.

C. Goals Module
- AddGoal component captures new goals.
- GoalList fetches and displays existing goals.
- Update/delete operations keep collection current.

D. Todos Module
- TodoList supports task creation, completion toggling, and deletion.
- Fast interaction model designed for daily usage.

E. Analytics Module
- Stats endpoint computes aggregate counts for goals and tasks.
- History endpoint computes per-day activity distribution.
- Frontend cards and charts provide immediate insight.

## 7. Data Model

The project uses two core entities:

Goal entity:
- username: String (user ownership context)
- title: String (goal name)
- description: String (detail text)
- deadline: Date (target completion date)
- status: String enum-like value (e.g., In Progress, Completed)
- timestamps: createdAt, updatedAt

Todo entity:
- username: String (user ownership context)
- text: String (task body)
- completed: Boolean (done/pending state)
- timestamps: createdAt, updatedAt

Design rationale:
- Username-based partitioning keeps model simple without auth complexity.
- Timestamp fields enable meaningful history analytics.
- Separate collections for goals and todos support independent growth.

## 8. API Design and Endpoint Documentation

Goals API:
- GET /api/goals?username=... : list goals for user
- POST /api/goals : create goal
- PUT /api/goals/:id : edit goal
- DELETE /api/goals/:id : remove goal

Todos API:
- GET /api/todos?username=... : list todos for user
- POST /api/todos : create todo
- PUT /api/todos/:id : update todo
- DELETE /api/todos/:id : remove todo

Dashboard API:
- GET /api/dashboard/stats?username=... : returns goals/todos aggregate counts
- GET /api/dashboard/history?username=... : returns 7-day goals/tasks activity

Error handling strategy:
- 400 for missing input or invalid updates.
- 500 for unexpected server/database failures.
- JSON error responses to keep frontend behavior predictable.

## 9. Frontend Implementation Details

The frontend uses route segmentation for maintainability:
- / : public landing page
- /dashboard : authenticated-like shell for productivity modules
- /dashboard/goals : goal management screen
- /dashboard/todos : todo management screen

State handling is component-local using React hooks, which is adequate for current scale and avoids unnecessary complexity from global stores.

The DashboardOverview page demonstrates asynchronous orchestration of multiple API calls, loading management, derived metric calculation, and dynamic chart rendering.

UI decisions prioritize readability: cards, spacing, neutral backgrounds, and clear typography make daily review comfortable.

## 10. Backend Implementation Details

The backend initializes configuration using dotenv, connects to MongoDB via Mongoose, then mounts middleware and API routes.

Important implementation traits:
- express.json() parses incoming request bodies.
- cors() allows browser-origin requests during development.
- Static serving from /dist supports production deployment of built frontend.
- Catch-all route returns index.html to enable client-side routing refresh behavior.

Analytics route logic includes lightweight aggregation:
- countDocuments() for totals and segmented categories.
- Date filtering on updatedAt for history calculations.
- Structured response format aligned with frontend graph and card needs.

## 11. Security, Performance, and Reliability Considerations

Current strengths:
- Environment variables isolate sensitive connection configuration.
- JSON APIs and schema-backed models reduce malformed data risk.
- Simplicity reduces attack surface in comparison with over-abstracted systems.

Improvement opportunities:
- Add authentication (JWT/session) and per-user authorization checks.
- Add input validation middleware (e.g., Zod/Joi) for stricter constraints.
- Introduce pagination or cursor queries for large datasets.
- Add rate limiting and security headers (helmet) in production.
- Replace console-only error handling with structured logging.

## 12. Testing Strategy Recommendation

Although this repository is primarily implementation-focused, a production-grade testing strategy should include:

Unit tests:
- Model validation and helper functions.

Integration tests:
- API endpoint behavior against a test database.

UI tests:
- Critical flows such as add goal, mark todo complete, dashboard load.

End-to-end tests:
- Browser automation to validate full user journeys.

Non-functional checks:
- Lighthouse performance audits.
- API response timing under synthetic load.

## 13. Deployment and Operations Notes

Recommended deployment pipeline:
1. Build frontend assets with vite build.
2. Start Node server to serve APIs + static dist.
3. Configure environment secrets securely.
4. Use managed MongoDB (Atlas) for high availability.
5. Add monitoring dashboards and alerting thresholds.

Operational best practices:
- Keep dependency versions pinned and audited.
- Maintain separate staging and production environments.
- Use backup and restore policy for MongoDB data.

## 14. Future Roadmap

Potential feature upgrades:
- User authentication and profile management.
- Tags, priorities, and recurring tasks.
- Goal milestones and progress percentages per goal.
- Calendar view and reminder notifications.
- Export reports (PDF/CSV) from dashboard analytics.
- AI-assisted task decomposition and planning suggestions.

Engineering roadmap:
- Introduce service and repository layers in backend for scale.
- Add TypeScript migration path for stronger type safety.
- Add CI pipeline with lint/test/build gates.

## 15. Conclusion

The Goal Tracker project successfully demonstrates a modern full-stack productivity application that is practical, understandable, and extensible. It solves a real-world planning-execution gap by combining goals, tasks, and progress analytics in one cohesive interface.

From a software engineering perspective, the application shows good foundations: modular frontend structure, clear REST APIs, schema-driven persistence, and meaningful user feedback. With incremental enhancements in security, testing, and feature depth, this project can evolve from a strong portfolio artifact into a production-ready personal productivity product.

## Appendix A. Repository Structure

```text
Goal/
├── server/
│   ├── index.js
│   └── models/
│       ├── Goal.js
│       └── Todo.js
├── src/
│   ├── components/
│   │   ├── dashboard/
│   │   ├── layout/
│   │   └── ui/
│   ├── pages/
│   ├── App.jsx
│   └── main.jsx
├── public/
├── README.md
└── package.json
```

## Appendix B. Source Code Listings

The following appendix includes selected source code to improve technical understanding of the project implementation. These listings are useful for viva, documentation review, onboarding, and maintenance handover.

### Backend Server (`server/index.js`)

```javascript
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import Goal from './models/Goal.js';
import Todo from './models/Todo.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGODB_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT || 3001;

const app = express();

if (!MONGODB_URI) {
    console.warn('Warning: MONGODB_URI is not defined in .env file');
}

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Serve Static Files (Frontend)
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Routes

// --- GOALS ---
app.get('/api/goals', async (req, res) => {
    try {
        const { username } = req.query;
        if (!username) return res.status(400).json({ error: 'Username required' });
        const goals = await Goal.find({ username }).sort({ createdAt: -1 });
        res.json(goals);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/goals', async (req, res) => {
    try {
        const goal = new Goal(req.body);
        await goal.save();
        res.status(201).json(goal);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.delete('/api/goals/:id', async (req, res) => {
    try {
        await Goal.findByIdAndDelete(req.params.id);
        res.json({ message: 'Goal deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/goals/:id', async (req, res) => {
    try {
        const goal = await Goal.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json(goal);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// --- TODOS ---
app.get('/api/todos', async (req, res) => {
    try {
        const { username } = req.query;
        if (!username) return res.status(400).json({ error: 'Username required' });
        const todos = await Todo.find({ username }).sort({ createdAt: -1 });
        res.json(todos);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/todos', async (req, res) => {
    try {
        const todo = new Todo(req.body);
        await todo.save();
        res.status(201).json(todo);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.put('/api/todos/:id', async (req, res) => {
    try {
        const todo = await Todo.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true }
        );
        res.json(todo);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.delete('/api/todos/:id', async (req, res) => {
    try {
        await Todo.findByIdAndDelete(req.params.id);
        res.json({ message: 'Todo deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- DASHBOARD STATS ---
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const { username } = req.query;
        if (!username) return res.status(400).json({ error: 'Username required' });

        const totalGoals = await Goal.countDocuments({ username });
        const completedGoals = await Goal.countDocuments({ username, status: 'Completed' });
        const inProgressGoals = await Goal.countDocuments({ username, status: 'In Progress' });
        
        const totalTodos = await Todo.countDocuments({ username });
        const pendingTodos = await Todo.countDocuments({ username, completed: false });
        const completedTodos = await Todo.countDocuments({ username, completed: true });

        res.json({
            goals: {
                total: totalGoals,
                completed: completedGoals,
                inProgress: inProgressGoals
            },
            todos: {
                total: totalTodos,
                pending: pendingTodos,
                completed: completedTodos
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/dashboard/history', async (req, res) => {
    try {
        const { username } = req.query;
        if (!username) return res.status(400).json({ error: 'Username required' });

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 6);

        // Fetch items modified in the last 7 days
        const goals = await Goal.find({ 
            username, 
            updatedAt: { $gte: startDate } 
        });
        
        const todos = await Todo.find({ 
            username, 
            updatedAt: { $gte: startDate } 
        });

        // Generate array of last 7 dates
        const history = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

            // Count activity for this day
            // We count 'goals' as goals updated/created this day
            // We count 'tasks' as todos updated/created this day
            const goalsCount = goals.filter(g => new Date(g.updatedAt).toISOString().split('T')[0] === dateStr).length;
            const tasksCount = todos.filter(t => new Date(t.updatedAt).toISOString().split('T')[0] === dateStr).length;

            history.unshift({
                name: dayName,
                goals: goalsCount,
                tasks: tasksCount
            });
        }

        res.json(history);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Catch-all route to serve generic index.html for React Router
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

```

### Goal Model (`server/models/Goal.js`)

```javascript
import mongoose from 'mongoose';

const goalSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required']
    },
    title: {
        type: String,
        required: [true, 'Goal title is required']
    },
    description: String,
    date: {
        type: Date,
        required: [true, 'Target date is required']
    },
    status: {
        type: String,
        enum: ['Not Started', 'In Progress', 'Completed'],
        default: 'Not Started'
    },
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    }
}, {
    timestamps: true
});

export default mongoose.model('Goal', goalSchema);

```

### Todo Model (`server/models/Todo.js`)

```javascript
import mongoose from 'mongoose';

const todoSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    text: {
        type: String,
        required: true
    },
    completed: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

export default mongoose.model('Todo', todoSchema);

```

### Application Router (`src/App.jsx`)

```javascript
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import DashboardLayout from './pages/Dashboard';
import DashboardOverview from './pages/DashboardOverview';
import Goals from './pages/Goals';
import Todos from './pages/Todos';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-950 text-white selection:bg-cyan-500 selection:text-white">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardOverview />} />
            <Route path="goals" element={<Goals />} />
            <Route path="todos" element={<Todos />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;

```

### Dashboard Shell (`src/pages/Dashboard.jsx`)

```javascript
import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { Bell, User } from 'lucide-react';
import UserOnboarding from '../components/ui/UserOnboarding';

const Dashboard = () => {
  const [username, setUsername] = useState(localStorage.getItem('desk_username') || '');
  const [showOnboarding, setShowOnboarding] = useState(!username);

  useEffect(() => {
    const storedName = localStorage.getItem('desk_username');
    if (storedName) {
      setUsername(storedName);
      setShowOnboarding(false);
    } else {
      setShowOnboarding(true);
    }
  }, []);

  const handleUserSet = (name) => {
    setUsername(name);
    localStorage.setItem('desk_username', name);
    setShowOnboarding(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <UserOnboarding isOpen={showOnboarding} onSave={handleUserSet} />

      {/* Main Layout Area */}
      <main className="flex-1 ml-0 md:ml-64 p-8 overflow-y-auto">
        {/* Global Header */}
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Welcome back, {username || 'friend'}!
            </h1>
            <p className="text-slate-500 text-sm">Here's your daily overview.</p>
          </div>

          <div className="flex items-center gap-6">
            <button className="relative p-2 text-gray-400 hover:bg-white hover:shadow-sm rounded-lg transition-all">
              <Bell className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pl-6 border-l border-gray-200">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center text-white font-medium shadow-md">
                {username ? username.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-semibold text-slate-900">{username || 'Guest User'}</p>
                <p className="text-xs text-slate-500">Personal Account</p>
              </div>
            </div>
          </div>
        </header>

        {/* Nested Routes Content */}
        <Outlet context={{ username }} />

      </main>
    </div>
  );
};

export default Dashboard;

```

### Dashboard Overview Page (`src/pages/DashboardOverview.jsx`)

```javascript
import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import StatsCard from '../components/dashboard/StatsCard';
import { Target, CheckCircle, Clock, ListTodo } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const DashboardOverview = () => {
    const { username } = useOutletContext();
    const [stats, setStats] = useState({
        goals: { total: 0, completed: 0, inProgress: 0 },
        todos: { total: 0, pending: 0, completed: 0 }
    });
    const [historyData, setHistoryData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!username) return;
            try {
                // Fetch Stats
                const statsResponse = await fetch(`/api/dashboard/stats?username=${username}`);
                if (statsResponse.ok) {
                    const data = await statsResponse.json();
                    setStats(data);
                }

                // Fetch History Graph Data
                const historyResponse = await fetch(`/api/dashboard/history?username=${username}`);
                if (historyResponse.ok) {
                    const history = await historyResponse.json();
                    setHistoryData(history);
                }

            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [username]);

    const calculateProgress = () => {
        if (stats.goals.total === 0) return 0;
        return Math.round((stats.goals.completed / stats.goals.total) * 100);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Dashboard Overview</h2>
                <p className="text-slate-500">Your progress at a glance.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard label="Total Goals" value={stats.goals.total} trend="normal" />
                <StatsCard label="Goals Completed" value={stats.goals.completed} trend="up" />
                <StatsCard label="Pending Tasks" value={stats.todos.pending} trend="warning" />
                <div className="bg-gradient-to-br from-blue-600 to-cyan-500 p-6 rounded-xl border border-transparent shadow-lg text-white">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="font-medium text-blue-100 text-sm">Overall Progress</h3>
                        <Target className="w-5 h-5 text-blue-100" />
                    </div>
                    <div className="flex items-end justify-between">
                        <span className="text-3xl font-bold">{calculateProgress()}%</span>
                    </div>
                    <div className="mt-4 w-full bg-blue-800/30 rounded-full h-1.5">
                        <div className="bg-white h-1.5 rounded-full transition-all duration-1000" style={{ width: `${calculateProgress()}%` }}></div>
                    </div>
                </div>
            </div>

            {/* Graphs Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <h3 className="font-semibold text-slate-900 mb-6">Activity Trends</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={historyData}>
                                <defs>
                                    <linearGradient id="colorGoals" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area type="monotone" dataKey="goals" stroke="#3b82f6" fillOpacity={1} fill="url(#colorGoals)" strokeWidth={3} />
                                <Area type="monotone" dataKey="tasks" stroke="#06b6d4" fillOpacity={1} fill="url(#colorTasks)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <h3 className="font-semibold text-slate-900 mb-6">Focus Breakdown</h3>
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-600">Active Goals</span>
                                <span className="font-medium text-slate-900">{stats.goals.inProgress}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2">
                                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(stats.goals.inProgress / (stats.goals.total || 1)) * 100}%` }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-600">Pending Tasks</span>
                                <span className="font-medium text-slate-900">{stats.todos.pending}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2">
                                <div className="bg-cyan-500 h-2 rounded-full" style={{ width: `${(stats.todos.pending / (stats.todos.total || 1)) * 100}%` }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-600">Completed Tasks</span>
                                <span className="font-medium text-slate-900">{stats.todos.completed}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2">
                                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${(stats.todos.completed / (stats.todos.total || 1)) * 100}%` }}></div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <p className="text-xs text-slate-400 text-center">
                            "Success is the sum of small efforts, repeated day in and day out."
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardOverview;

```

### Goals Page (`src/pages/Goals.jsx`)

```javascript
import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import GoalList from '../components/dashboard/GoalList';
import AddGoal from '../components/dashboard/AddGoal';

const Goals = () => {
    const { username } = useOutletContext();
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const onGoalAdded = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">My Goals</h2>
                    <p className="text-slate-500">Track and manage your personal objectives.</p>
                </div>
                <AddGoal onGoalAdded={onGoalAdded} username={username} />
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <GoalList username={username} triggerRefresh={refreshTrigger} />
            </div>
        </div>
    );
};

export default Goals;

```

### Todos Page (`src/pages/Todos.jsx`)

```javascript
import React from 'react';
import { useOutletContext } from 'react-router-dom';
import TodoList from '../components/dashboard/TodoList';

const Todos = () => {
    const { username } = useOutletContext();
    return (
        <div className="h-[calc(100vh-140px)] animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900">To-Do List</h2>
                <p className="text-slate-500">Manage your daily tasks and stay productive.</p>
            </div>

            <div className="h-full">
                <TodoList username={username} />
            </div>
        </div>
    );
};

export default Todos;

```

### Goal List Component (`src/components/dashboard/GoalList.jsx`)

```javascript
import React, { useState, useEffect } from 'react';
import { Plus, Clock, Trash2 } from 'lucide-react';

const GoalList = ({ username, triggerRefresh }) => {
    const [goals, setGoals] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchGoals = async () => {
        if (!username) return;
        try {
            setLoading(true);
            const response = await fetch(`/api/goals?username=${username}`);
            if (response.ok) {
                const data = await response.json();
                setGoals(data);
            }
        } catch (error) {
            console.error('Error fetching goals:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGoals();
    }, [username, triggerRefresh]);

    const deleteGoal = async (id) => {
        try {
            await fetch(`/api/goals/${id}`, { method: 'DELETE' });
            fetchGoals();
        } catch (e) {
            console.error(e);
        }
    };

    const updateStatus = async (id, newStatus) => {
        try {
            const response = await fetch(`/api/goals/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (response.ok) {
                fetchGoals();
            }
        } catch (e) {
            console.error(e);
        }
    };

    const getDaysLeft = (targetDate) => {
        const diff = new Date(targetDate) - new Date();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
                            <th className="px-6 py-3">Goal</th>
                            <th className="px-6 py-3">Deadline</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {goals.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="px-6 py-8 text-center text-slate-400">
                                    No goals found. Start by adding one!
                                </td>
                            </tr>
                        ) : (
                            goals.map(goal => {
                                const daysLeft = getDaysLeft(goal.date);
                                const isExpired = daysLeft < 0;

                                return (
                                    <tr key={goal._id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-slate-900">{goal.title}</p>
                                            {goal.description && <p className="text-xs text-slate-500 truncate max-w-[200px]">{goal.description}</p>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`flex items-center gap-1.5 ${isExpired ? 'text-red-500' : daysLeft < 3 ? 'text-amber-500' : 'text-slate-500'}`}>
                                                <Clock className="w-4 h-4" />
                                                <span>
                                                    {isExpired ? 'Expired' : `${daysLeft} days left`}
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-400 mt-0.5 ml-5">
                                                {new Date(goal.date).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={goal.status}
                                                onChange={(e) => updateStatus(goal._id, e.target.value)}
                                                className={`block w-full pl-2 pr-8 py-1 text-xs font-medium border rounded-full appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all
                                            ${goal.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200 focus:ring-green-500' : ''}
                                            ${goal.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-200 focus:ring-blue-500' : ''}
                                            ${goal.status === 'Not Started' ? 'bg-slate-100 text-slate-600 border-slate-200 focus:ring-slate-400' : ''}
                                        `}
                                            >
                                                <option value="Not Started">Not Started</option>
                                                <option value="In Progress">In Progress</option>
                                                <option value="Completed">Completed</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => deleteGoal(goal._id)}
                                                className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default GoalList;

```

### Add Goal Component (`src/components/dashboard/AddGoal.jsx`)

```javascript
import React, { useState } from 'react';
import { Plus, X, Calendar, Clock } from 'lucide-react';

const AddGoal = ({ onGoalAdded, username }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        date: '',
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await fetch('/api/goals', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    username,
                }),
            });

            if (response.ok) {
                onGoalAdded();
                setIsOpen(false);
                setFormData({ title: '', description: '', date: '' });
            }
        } catch (error) {
            console.error('Error adding goal:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
            >
                <Plus className="w-4 h-4" />
                <span>Add New Goal</span>
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />

                    <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900">Create New Goal</h3>
                            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Goal Title</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g. Read 20 Books"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Target Date</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows="3"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none text-slate-900"
                                />
                            </div>

                            <div className="pt-4 flex gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-70 flex items-center gap-2"
                                >
                                    {loading ? 'Creating...' : 'Create Goal'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default AddGoal;

```

### Todo List Component (`src/components/dashboard/TodoList.jsx`)

```javascript
import React, { useState, useEffect } from 'react';
import { Plus, Check, Trash2, Square } from 'lucide-react';
import clsx from 'clsx';

const TodoList = ({ username }) => {
    const [todos, setTodos] = useState([]);
    const [newTodo, setNewTodo] = useState('');

    const fetchTodos = async () => {
        if (!username) return;
        try {
            const response = await fetch(`/api/todos?username=${username}`);
            if (response.ok) {
                const data = await response.json();
                setTodos(data);
            }
        } catch (error) {
            console.error('Error fetching todos:', error);
        }
    };

    useEffect(() => {
        fetchTodos();
    }, [username]);

    const handleAddTodo = async (e) => {
        e.preventDefault();
        if (!newTodo.trim()) return;

        try {
            const response = await fetch('/api/todos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, text: newTodo.trim() }),
            });
            if (response.ok) {
                setNewTodo('');
                fetchTodos();
            }
        } catch (error) {
            console.error('Error adding todo:', error);
        }
    };

    const toggleTodo = async (id, currentStatus) => {
        try {
            const response = await fetch(`/api/todos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed: !currentStatus }),
            });
            if (response.ok) {
                fetchTodos();
            }
        } catch (error) {
            console.error('Error toggling todo:', error);
        }
    };

    const deleteTodo = async (id) => {
        try {
            const response = await fetch(`/api/todos/${id}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                fetchTodos();
            }
        } catch (error) {
            console.error('Error deleting todo:', error);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm h-full flex flex-col">
            <h3 className="font-semibold text-slate-900 mb-4">Quick To-Do</h3>

            <form onSubmit={handleAddTodo} className="flex gap-2 mb-4">
                <input
                    type="text"
                    value={newTodo}
                    onChange={(e) => setNewTodo(e.target.value)}
                    placeholder="New task..."
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none text-slate-900"
                />
                <button
                    type="submit"
                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </form>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {todos.length === 0 ? (
                    <div className="text-center text-slate-400 py-4 text-xs">No tasks yet</div>
                ) : (
                    todos.map(todo => (
                        <div key={todo._id} className="group flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors">
                            <button
                                onClick={() => toggleTodo(todo._id, todo.completed)}
                                className={clsx(
                                    "w-5 h-5 rounded flex items-center justify-center border transition-all",
                                    todo.completed ? "bg-blue-500 border-blue-500 text-white" : "border-slate-300 text-transparent hover:border-blue-400"
                                )}
                            >
                                <Check className="w-3 h-3" />
                            </button>
                            <span className={clsx("flex-1 text-sm transition-all", todo.completed ? "text-slate-400 line-through" : "text-slate-700")}>
                                {todo.text}
                            </span>
                            <button
                                onClick={() => deleteTodo(todo._id)}
                                className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default TodoList;

```

### Sidebar (`src/components/layout/Sidebar.jsx`)

```javascript
import React from 'react';
import { Home, Target, Lightbulb, MessageSquare, Calendar, Settings, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';

const Sidebar = () => {
    const location = useLocation();

    const menuItems = [
        { icon: Home, label: 'Dashboard', path: '/dashboard' },
        { icon: Target, label: 'Goals', path: '/dashboard/goals' },
        { icon: Calendar, label: 'To-Do List', path: '/dashboard/todos' },
    ];

    return (
        <aside className="w-64 h-screen fixed left-0 top-0 bg-white border-r border-gray-100 flex flex-col z-40 hidden md:flex">
            <div className="p-6 flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                    D
                </div>
                <span className="text-2xl font-bold text-slate-900">Desk</span>
            </div>

            <nav className="flex-1 px-4 space-y-1">
                {menuItems.map((item) => {
                    const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={clsx(
                                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors relative group",
                                isActive
                                    ? "bg-slate-50 text-blue-600"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                            )}
                        >
                            <item.icon className={clsx("w-5 h-5", isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
                            <span>{item.label}</span>
                            {item.badge && (
                                <span className="ml-auto bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-semibold">
                                    {item.badge}
                                </span>
                            )}
                            {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-r-full" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-100 space-y-1">
                {/* Settings removed for now */}
            </div>
        </aside>
    );
};

export default Sidebar;

```

### User Onboarding Modal (`src/components/ui/UserOnboarding.jsx`)

```javascript
import React, { useState } from 'react';
import { User, ArrowRight } from 'lucide-react';

const UserOnboarding = ({ isOpen, onSave }) => {
    const [name, setName] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (name.trim()) {
            onSave(name.trim());
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-cyan-400" />

                <div className="text-center mb-8">
                    <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                        <User className="w-8 h-8 text-blue-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome to Desk</h2>
                    <p className="text-slate-500">Let's get to know you. What should we call you?</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">Your Name</label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow outline-none text-slate-900 placeholder:text-gray-300"
                            placeholder="e.g. Alex Smith"
                            autoFocus
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                    >
                        <span>Get Started</span>
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default UserOnboarding;

```

### README (`README.md`)

```markdown
# Goal Tracker App

This is the Goal Tracker application, a full-stack app for managing goals, todos, and dashboard statistics.

## Project Overview

The Goal Tracker App is designed to help users organize their objectives and daily tasks efficiently. It features a clean, intuitive interface for:

-   **Goal Management**: Create, update, and track long-term goals with deadlines and status updates.
-   **Todo List**: Manage daily tasks with a simple checkbox interface.
-   **Dashboard Analytics**: Visualize progress with real-time statistics and a 7-day activity history.
-   **Responsive Design**: A seamless experience across desktop and mobile devices.

Built with **React** on the frontend and **Node.js/Express** on the backend, it utilizes **MongoDB** for persistent data storage.

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)

## Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Configure environment variables:
    Create a `.env` file in the root directory and add your MongoDB connection string:
    ```env
    MONGODB_URI=mongodb://localhost:27017/goal-tracker
    PORT=3001
    ```

## Usage

Start the server:

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

The server will start on `http://localhost:3001` (or your configured PORT).

## API Endpoints

All endpoints expect JSON bodies where applicable.

### Goals

-   **GET /api/goals?username={username}**
    -   Fetch all goals for a specific username.
-   **POST /api/goals**
    -   Create a new goal.
    -   Body: `{ username, title, description, deadline, status }`
-   **PUT /api/goals/:id**
    -   Update a goal by ID.
    -   Body: `{ title, description, deadline, status }`
-   **DELETE /api/goals/:id**
    -   Delete a goal by ID.

### Todos

-   **GET /api/todos?username={username}**
    -   Fetch all todos for a specific username.
-   **POST /api/todos**
    -   Create a new todo.
    -   Body: `{ username, text, completed }`
-   **PUT /api/todos/:id**
    -   Update a todo by ID.
    -   Body: `{ text, completed }`
-   **DELETE /api/todos/:id**
    -   Delete a todo by ID.

### Dashboard

-   **GET /api/dashboard/stats?username={username}**
    -   Get summary statistics (total/completed goals and todos).
-   **GET /api/dashboard/history?username={username}**
    -   Get activity history for the last 7 days.

## Imports Used

The backend uses the following main packages:

-   `express`: Web framework for Node.js.
-   `mongoose`: MongoDB object modeling.
-   `cors`: Middleware to enable Cross-Origin Resource Sharing.
-   `dotenv`: JSON Web Token authentication (configured but implementation details may vary).

## Project Structure

```
├── models/         # Mongoose models (Goal.js, Todo.js)
├── server/         # Server entry point
│   └── index.js
├── .env            # Environment variables
├── package.json    # Project dependencies and scripts
└── README.md       # Project documentation
```

```

### Package Manifest (`package.json`)

```json
{
  "name": "desk-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "start": "node server/index.js",
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "clsx": "^2.1.1",
    "cors": "^2.8.6",
    "dotenv": "^17.2.3",
    "express": "^5.2.1",
    "framer-motion": "^12.29.3",
    "lucide-react": "^0.563.0",
    "mongoose": "^9.1.5",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-router-dom": "^7.13.0",
    "recharts": "^3.7.0",
    "tailwind-merge": "^3.4.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.1",
    "@tailwindcss/postcss": "^4.1.18",
    "@types/react": "^19.2.5",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^5.1.1",
    "autoprefixer": "^10.4.24",
    "eslint": "^9.39.1",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.4.24",
    "globals": "^16.5.0",
    "postcss": "^8.5.6",
    "tailwindcss": "^4.1.18",
    "vite": "^7.2.4"
  }
}
```
