import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../services/api';

const Dashboard = ({ user }) => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({ totalProjects: 0, totalTests: 0, passedTests: 0, failedTests: 0 });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', description: '' });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const projectsRes = await API.get('/projects');
      const allProjects = projectsRes.data || [];
      setProjects(allProjects);

      let totalTests = 0;
      let passedTests = 0;
      let failedTests = 0;

      for (const project of allProjects) {
        const runs = (await API.get(`/tests/${project._id}`)).data || [];
        totalTests += runs.length;
        passedTests += runs.filter((run) => run.status === 'PASS').length;
        failedTests += runs.filter((run) => run.status === 'FAIL').length;
      }

      setStats({
        totalProjects: allProjects.length,
        totalTests,
        passedTests,
        failedTests
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      await API.post('/projects', form);
      setForm({ name: '', url: '', description: '' });
      setShowForm(false);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Could not create project');
    }
  };

  const handleDeleteProject = async (projectId) => {
    try {
      await API.delete(`/projects/${projectId}`);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Could not delete project');
    }
  };

  if (loading) {
    return <div className="loading-text">Loading dashboard...</div>;
  }

  return (
    <div className="page-container">
      <div className="header-row">
        <div>
          <h1>Visual Regression Testing System</h1>
          <p>Welcome, {user?.name || 'User'}</p>
        </div>
        <div className="header-actions">
          <button onClick={() => setShowForm(!showForm)}>Create Project</button>
        </div>
      </div>

      {showForm && (
        <div className="form-card">
          <h3>Create Project</h3>
          <form onSubmit={handleCreateProject}>
            <label>Project Name</label>
            <input type="text" name="name" value={form.name} onChange={handleChange} required />

            <label>Website URL</label>
            <input type="text" inputMode="url" name="url" value={form.url} onChange={handleChange} placeholder="https://example.com/" required />

            <label>Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows="3" />

            <button type="submit">Create Project</button>
          </form>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <strong>Total Projects</strong>
          <span>{stats.totalProjects}</span>
        </div>
        <div className="stat-card">
          <strong>Total Tests</strong>
          <span>{stats.totalTests}</span>
        </div>
        <div className="stat-card">
          <strong>Passed Tests</strong>
          <span>{stats.passedTests}</span>
        </div>
        <div className="stat-card">
          <strong>Failed Tests</strong>
          <span>{stats.failedTests}</span>
        </div>
      </div>

      <div className="projects-section">
        <h2>Projects</h2>
        {projects.length === 0 ? (
          <p>No projects yet.</p>
        ) : (
          <div className="project-list">
            {projects.map((project) => (
              <div className="project-card" key={project._id}>
                <h3>{project.name}</h3>
                <p><strong>URL:</strong> {project.url}</p>
                <p><strong>Description:</strong> {project.description || 'No description'}</p>
                <div className="project-actions">
                  <button onClick={() => navigate(`/projects/${project._id}`)}>Open</button>
                  <button className="danger" onClick={() => handleDeleteProject(project._id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
