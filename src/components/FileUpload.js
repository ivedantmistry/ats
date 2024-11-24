import React, { useState } from 'react';
import Uppy from '@uppy/core';
import { Dashboard } from '@uppy/react';
import XHRUpload from '@uppy/xhr-upload';
import '@uppy/core/dist/style.css';
import '@uppy/dashboard/dist/style.css';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const FileUpload = () => {
  const navigate = useNavigate();
  const [resumeKeywords, setResumeKeywords] = useState([]);
  const [jobKeywords, setJobKeywords] = useState([]);
  const [jobDescription, setJobDescription] = useState('');
  const [jobFile, setJobFile] = useState(null);

  const [isResumeUploaded, setIsResumeUploaded] = useState(false);
  const [isJobDescriptionProcessed, setIsJobDescriptionProcessed] = useState(false);

  const uppy = new Uppy({
    restrictions: { maxNumberOfFiles: 1, allowedFileTypes: ['.pdf', '.doc', '.docx'] },
    autoProceed: true,
  });

  // Configure Uppy for resume upload
  uppy.use(XHRUpload, {
    endpoint: 'http://localhost:5000/api/resume/upload',
    formData: true,
    fieldName: 'resume',
  });

  // Handle resume upload completion
  uppy.on('complete', async (result) => {
    if (!result.successful.length) {
      console.error('No files uploaded successfully:', result);
      return;
    }

    try {
      const fileInfo = result.successful[0];
      console.log('Uploaded Resume Info:', fileInfo);

      const response = await axios.post(
        'http://localhost:5000/api/documents/process',
        {
          fileId: fileInfo.response.body.fileId,
          fileText: fileInfo.response.body.fileText,
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      console.log('Resume Processing Results:', response.data.keywords);
      setResumeKeywords(response.data.keywords);
      setIsResumeUploaded(true);

      // Check if ready to navigate
      checkNavigation(response.data.keywords, jobKeywords);
    } catch (error) {
      console.error('Error processing resume:', error);
    }
  });

  // Handle job description processing (file or pasted text)
  const handleJobDescriptionSubmit = async (e) => {
    e.preventDefault();

    try {
      let extractedKeywords = [];
      if (jobFile) {
        // Upload and process job description file
        const formData = new FormData();
        formData.append('jobDescription', jobFile);

        const response = await axios.post(
          'http://localhost:5000/api/job/upload',
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        extractedKeywords = response.data.keywords;
      } else if (jobDescription.trim()) {
        // Process pasted job description text
        const response = await axios.post(
          'http://localhost:5000/api/job/keywords',
          { text: jobDescription },
          { headers: { 'Content-Type': 'application/json' } }
        );
        extractedKeywords = response.data.keywords;
      } else {
        console.error('No job description provided.');
        return;
      }

      console.log('Job Description Keywords:', extractedKeywords);
      setJobKeywords(extractedKeywords);
      setIsJobDescriptionProcessed(true);

      // Check if ready to navigate
      checkNavigation(resumeKeywords, extractedKeywords);
    } catch (error) {
      console.error('Error processing job description:', error);
    }
  };

  // Navigate to results page when both resume and job description are ready
  const checkNavigation = (resumeKeywords, jobKeywords) => {
    if (resumeKeywords.length > 0 && jobKeywords.length > 0) {
      navigate('/results', {
        state: { resumeKeywords, jobKeywords },
      });
    }
  };

  return (
    <div>
      <h1>Upload Resume and Job Description</h1>

      {/* Resume Upload Section */}
      <div style={{ marginBottom: '30px' }}>
        <h2>Upload Resume</h2>
        <Dashboard uppy={uppy} />
        {isResumeUploaded && <p>Resume uploaded and processed successfully.</p>}
      </div>

      {/* Job Description Section */}
      <div>
        <h2>Upload or Paste Job Description</h2>
        <form onSubmit={handleJobDescriptionSubmit}>
          <textarea
            placeholder="Paste job description here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows="5"
            cols="50"
            style={{ marginBottom: '15px', width: '100%' }}
          />
          <br />
          <input
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            onChange={(e) => setJobFile(e.target.files[0])}
            style={{ marginBottom: '15px' }}
          />
          <br />
          <button type="submit">Submit Job Description</button>
        </form>
        {isJobDescriptionProcessed && <p>Job description processed successfully.</p>}
      </div>
    </div>
  );
};

export default FileUpload;
