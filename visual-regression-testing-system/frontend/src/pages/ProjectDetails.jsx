import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import API from '../services/api';

const resultHeadings = {
  INVALID_URL_FORMAT: '❌ Invalid URL Format',
  WEBSITE_UNAVAILABLE: '❌ Website Not Found / Cannot Reach Website',
  TIMEOUT: '⚠️ Website Timeout',
  FAIL: '❌ Visual Regression Detected',
  PASS: '✅ Visual Test Passed',
  RUNNING: 'Running Visual Test',
  BASELINE_MISSING: 'Baseline Screenshot Required',
  IMAGE_COMPARISON_ERROR: 'Image Comparison Could Not Complete',
  SELENIUM_ERROR: 'Browser Could Not Complete Website Check',
  INTERNAL_ERROR: 'Visual Test Could Not Complete',
  REQUEST_ERROR: 'Could Not Contact Test Service'
};

const getResultTone = (status) => {
  if (status === 'PASS') return 'pass';
  if (status === 'TIMEOUT') return 'warning';
  if (status === 'RUNNING') return 'info';
  return 'fail';
};

const isHttpUrl = (value) => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch (error) {
    return false;
  }
};

const getRequestErrorResult = (error, url) => ({
  success: false,
  status: 'REQUEST_ERROR',
  message: 'Could not contact the visual test service',
  explanation: 'The backend did not return a result.',
  url,
  possibleReasons: ['The backend server is stopped or unreachable'],
  suggestedSolution: 'Check that the backend is running, then try again.',
  testedAt: new Date().toISOString(),
  ...error.response?.data
});

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [runs, setRuns] = useState([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [latestRunId, setLatestRunId] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [baselinePreview, setBaselinePreview] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchProject = async () => {
    try {
      const [projectRes, runsRes] = await Promise.all([
        API.get(`/projects/${id}`),
        API.get(`/tests/${id}`)
      ]);
      setProject(projectRes.data);
      setRuns(runsRes.data || []);
      if (projectRes.data.baselineImage) {
        setBaselinePreview(`http://localhost:5000${projectRes.data.baselineImage}`);
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Project not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [id]);

  const handleCreateBaseline = async () => {
    setMessageType('info');
    setMessage('Creating baseline...');
    setTestResult({
      success: false,
      status: 'RUNNING',
      message: 'Selenium is opening the website and capturing the approved baseline.',
      explanation: 'The website must load successfully before its screenshot can be saved.',
      url: project.url,
      testedAt: new Date().toISOString()
    });
    try {
      const { data } = await API.post(`/tests/baseline/${id}`);
      setMessageType('success');
      setMessage(data.message || 'Baseline created successfully.');
      setTestResult(null);
      setBaselinePreview(`http://localhost:5000${data.baselineImage}`);
      fetchProject();
    } catch (error) {
      setMessage('');
      setTestResult(getRequestErrorResult(error, project.url));
    }
  };

  const handleRunTest = async () => {
    setLatestRunId('');
    setTestResult({
      success: false,
      status: 'RUNNING',
      message: 'Selenium is opening the website and capturing a screenshot.',
      explanation: 'The visual comparison will start only after the website loads and the screenshot is captured.',
      url: project.url,
      testedAt: new Date().toISOString()
    });
    try {
      const { data } = await API.post(`/tests/run/${id}`);
      setTestResult(data);
      setLatestRunId(data.runId);
      fetchProject();
    } catch (error) {
      setTestResult(getRequestErrorResult(error, project.url));
    }
  };

  const handleDeleteProject = async () => {
    try {
      await API.delete(`/projects/${id}`);
      navigate('/dashboard');
    } catch (error) {
      setMessageType('error');
      setMessage(error.response?.data?.message || 'Could not delete project');
    }
  };

  if (loading) {
    return <div className="loading-text">Loading project...</div>;
  }

  if (!project) {
    return <div className="page-container"><div className="error-box">{message || 'Project not found'}</div></div>;
  }

  return (
    <div className="page-container">
      <div className="header-row">
        <div>
          <h1>{project.name}</h1>
          <p>{project.url}</p>
          <p>{project.description}</p>
        </div>
        <div className="header-actions">
          <button onClick={handleCreateBaseline}>Create Baseline</button>
          <button onClick={handleRunTest}>Run Visual Test</button>
          <Link to="/dashboard" className="secondary-button">View Test History</Link>
          <button className="danger" onClick={handleDeleteProject}>Delete Project</button>
        </div>
      </div>

      {message && (
        <div className={`${messageType}-box`} role="status">
          {message}
        </div>
      )}

      {testResult && (
        <section className={`test-result-card ${getResultTone(testResult.status)}`} role="status" aria-live="polite">
          <h2>{resultHeadings[testResult.status] || 'Visual Test Result'}</h2>
          <p><strong>Status:</strong> {testResult.status}</p>
          {testResult.url && (
            <p>
              <strong>URL:</strong>{' '}
              {isHttpUrl(testResult.url)
                ? <a href={testResult.url} target="_blank" rel="noreferrer">{testResult.url}</a>
                : <span>{testResult.url}</span>}
            </p>
          )}
          <p><strong>Message:</strong> {testResult.message}</p>
          {testResult.explanation && <p><strong>Explanation:</strong> {testResult.explanation}</p>}
          {testResult.example && <p><strong>Example:</strong> <a href={testResult.example}>{testResult.example}</a></p>}
          {Array.isArray(testResult.possibleReasons) && testResult.possibleReasons.length > 0 && (
            <div>
              <strong>Possible reasons:</strong>
              <ul>{testResult.possibleReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
            </div>
          )}
          {testResult.suggestedSolution && <p><strong>Suggested solution:</strong> {testResult.suggestedSolution}</p>}
          {Number.isFinite(testResult.differencePercentage) && (
            <p><strong>Difference:</strong> {Number(testResult.differencePercentage).toFixed(2)}%</p>
          )}
          {Number.isFinite(testResult.threshold) && <p><strong>Threshold:</strong> {testResult.threshold}%</p>}
          {testResult.testedAt && <p><strong>Date and time:</strong> {new Date(testResult.testedAt).toLocaleString()}</p>}
          {latestRunId && <Link to={`/reports/${latestRunId}`}>View test report</Link>}
        </section>
      )}

      {baselinePreview && (
        <div className="image-preview-card">
          <h3>Baseline Screenshot</h3>
          <img src={baselinePreview} alt="Baseline" />
        </div>
      )}

      <div className="table-card">
        <h3>Test History</h3>
        {runs.length === 0 ? (
          <p>No test runs available yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>Difference %</th>
                <th>Report</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run._id}>
                  <td>{new Date(run.createdAt).toLocaleString()}</td>
                  <td>
                    <span className={run.status === 'PASS' ? 'pass' : 'fail'}>{run.status}</span>
                    {run.failureReason && <small className="history-failure-note">{run.failureReason}</small>}
                  </td>
                  <td>{Number(run.differencePercentage || 0).toFixed(2)}%</td>
                  <td><Link to={`/reports/${run._id}`}>View Report</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ProjectDetails;
