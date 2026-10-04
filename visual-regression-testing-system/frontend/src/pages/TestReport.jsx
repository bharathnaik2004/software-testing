import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import API from '../services/api';

const TestReport = () => {
  const { runId } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const { data } = await API.get(`/tests/report/${runId}`);
        setReport(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [runId]);

  if (loading) return <div className="loading-text">Loading report...</div>;
  if (!report) return <div className="page-container"><div className="error-box">Report not found</div></div>;

  return (
    <div className="page-container">
      <h1>Visual Regression Test Report</h1>

      <div className="report-card">
        <p><strong>Project:</strong> {report.projectName}</p>
        <p><strong>Website URL:</strong> {report.url}</p>
        <p><strong>Test Date:</strong> {new Date(report.testDate).toLocaleString()}</p>
        <h2 className={report.status === 'PASS' ? 'pass' : 'fail'}>
          {report.status === 'PASS' ? '✅ Visual Test Passed' : '❌ Visual Regression Detected'}
        </h2>
        <p><strong>Status:</strong> <span className={report.status === 'PASS' ? 'pass' : 'fail'}>{report.status}</span></p>
        <p><strong>Difference Percentage:</strong> {Number(report.differencePercentage || 0).toFixed(2)}%</p>
        <p><strong>Threshold:</strong> {Number(report.threshold || 0).toFixed(2)}%</p>
        <p><strong>Explanation:</strong> {report.explanation}</p>
        {report.suggestedSolution && <p><strong>Suggested solution:</strong> {report.suggestedSolution}</p>}
        {report.failureReason && <p className="failure-reason"><strong>Failure reason:</strong> {report.failureReason}</p>}
      </div>

      <div className="image-grid">
        <div className="image-card">
          <h3>Baseline</h3>
          {report.baselineImage ? <img src={report.baselineImage} alt="Baseline" /> : <p>No baseline image</p>}
        </div>
        <div className="image-card">
          <h3>Current</h3>
          {report.currentImage ? <img src={report.currentImage} alt="Current" /> : <p>No current image</p>}
        </div>
        <div className="image-card">
          <h3>Difference</h3>
          {report.diffImage ? <img src={report.diffImage} alt="Difference" /> : <p>No diff image</p>}
        </div>
      </div>
    </div>
  );
};

export default TestReport;
