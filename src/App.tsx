import React, { useState, useEffect, useRef } from 'react';
import { Home, User, Stethoscope, FlaskConical, Pill, ClipboardList, Settings, Search, Plus, Trash2, Download, Save, Upload, Sparkles, X, Camera, ImagePlus } from 'lucide-react';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface PatientRecord {
  id: string;
  name: string;
  date: string;
  time: string;
  report?: string; // HTML string from old version
  data?: PatientData; // Structured data for new version
}

interface PatientData {
  serial: string;
  name: string;
  age: string;
  sex: string;
  complaint: string;
  vitals: { bp: string; hr: string; temp: string; rr: string };
  exam: string;
  diagnosis: string;
  rx: string;
}

const initialPatientData: PatientData = {
  serial: '',
  name: '',
  age: '',
  sex: 'Male',
  complaint: '',
  vitals: { bp: '', hr: '', temp: '', rr: '' },
  exam: '',
  diagnosis: '',
  rx: ''
};

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [clinicName, setClinicName] = useState('Al-Wajeeh Clinic');
  const [clinicLogo, setClinicLogo] = useState('');
  
  const [db, setDb] = useState<PatientRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [currentPatient, setCurrentPatient] = useState<PatientData>(initialPatientData);
  const [labImages, setLabImages] = useState<string[]>([]);
  const [radImages, setRadImages] = useState<string[]>([]);
  
  const [aiOutput, setAiOutput] = useState('');
  const [viewingOldReport, setViewingOldReport] = useState<string | null>(null);
  const [fullImage, setFullImage] = useState<string | null>(null);

  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedName = localStorage.getItem('clinic_name');
    if (savedName) setClinicName(savedName);
    
    const savedLogo = localStorage.getItem('clinic_logo');
    if (savedLogo) setClinicLogo(savedLogo);
    
    const savedDb = localStorage.getItem('alwajeeh_db');
    if (savedDb) {
      try {
        setDb(JSON.parse(savedDb));
      } catch (e) {
        console.error("Failed to parse DB", e);
      }
    }
  }, []);

  const saveToDb = (newRecord: PatientRecord) => {
    const updatedDb = [...db, newRecord];
    setDb(updatedDb);
    localStorage.setItem('alwajeeh_db', JSON.stringify(updatedDb));
  };

  const handlePatientChange = (field: string, value: string) => {
    setCurrentPatient(prev => ({ ...prev, [field]: value }));
  };

  const handleVitalChange = (field: string, value: string) => {
    setCurrentPatient(prev => ({
      ...prev,
      vitals: { ...prev.vitals, [field]: value }
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'lab' | 'rad') => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            if (type === 'lab') {
              setLabImages(prev => [...prev, event.target!.result as string]);
            } else {
              setRadImages(prev => [...prev, event.target!.result as string]);
            }
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const initNewPatient = () => {
    if (window.confirm("Start new patient?")) {
      setCurrentPatient(initialPatientData);
      setLabImages([]);
      setRadImages([]);
      setViewingOldReport(null);
      setActiveTab('new-patient');
    }
  };

  const confirmWipe = () => {
    if (window.confirm("Clear all form data?")) {
      setCurrentPatient(initialPatientData);
      setLabImages([]);
      setRadImages([]);
    }
  };

  const saveSettings = () => {
    localStorage.setItem('clinic_name', clinicName);
    if (clinicLogo) localStorage.setItem('clinic_logo', clinicLogo);
    alert("Settings saved.");
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setClinicLogo(event.target.result as string);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const exportDatabase = () => {
    const data = {
      clinic_name: clinicName,
      clinic_logo: clinicLogo,
      patients: db
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `AlWajeeh_Backup.json`;
    a.click();
  };

  const importDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.clinic_name) {
          setClinicName(data.clinic_name);
          localStorage.setItem('clinic_name', data.clinic_name);
        }
        if (data.clinic_logo) {
          setClinicLogo(data.clinic_logo);
          localStorage.setItem('clinic_logo', data.clinic_logo);
        }
        if (data.patients) {
          setDb(data.patients);
          localStorage.setItem('alwajeeh_db', JSON.stringify(data.patients));
        }
        alert("Database imported successfully.");
      } catch (err) {
        alert("Invalid backup file.");
      }
    };
    reader.readAsText(e.target.files[0]);
  };

  const runAISimulation = async () => {
    if (!currentPatient.rx) {
      setAiOutput("Please enter a prescription to check.");
      return;
    }
    
    setAiOutput("AI: Analyzing prescription...");
    try {
      const response = await fetch('/api/ai-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rx: currentPatient.rx,
          diagnosis: currentPatient.diagnosis,
          age: currentPatient.age,
          sex: currentPatient.sex,
          vitals: currentPatient.vitals
        })
      });
      const data = await response.json();
      if (data.error) {
        setAiOutput(`<b>Error:</b> ${data.error}`);
      } else {
        const formatted = data.result.replace(/\n/g, '<br/>');
        setAiOutput(`<b>AI Analysis:</b><br/>${formatted}`);
      }
    } catch (err) {
      setAiOutput("<b>Error:</b> Failed to connect to AI service.");
    }
  };

  const downloadPDF = () => {
    if (!summaryRef.current) return;
    const element = summaryRef.current;
    const opt = {
      margin: 10,
      filename: `Patient_${currentPatient.name || 'Record'}_${Date.now()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  const finalSave = () => {
    if (!currentPatient.name) {
      alert("Patient name required.");
      return;
    }
    const now = new Date();
    
    // Generate HTML report for backward compatibility and easy viewing
    const reportHtml = summaryRef.current?.innerHTML || '';

    const newRecord: PatientRecord = {
      id: Date.now().toString(),
      name: currentPatient.name,
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      report: reportHtml,
      data: currentPatient
    };

    saveToDb(newRecord);
    alert("Patient record saved successfully.");
    setActiveTab('home');
  };

  const viewOldRecord = (reportHtml: string) => {
    setViewingOldReport(reportHtml);
    setActiveTab('summary');
  };

  const filteredDb = db.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).reverse();

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white p-5 rounded-xl shadow-sm mb-5 text-center">
              <h2 className="text-teal-700 text-xl font-bold mb-4">Clinic Dashboard</h2>
              <button 
                onClick={initNewPatient}
                className="w-full bg-teal-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-teal-700 transition-colors"
              >
                <Plus size={20} /> NEW PATIENT ENTRY
              </button>
              
              <div className="mt-6 text-left">
                <label className="block text-teal-700 font-semibold mb-2 text-sm">Search Patient Records</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                  <input 
                    type="text" 
                    placeholder="Search name..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none transition-colors"
                  />
                </div>
                
                <div className="mt-4 space-y-3">
                  {searchQuery && filteredDb.map((p, i) => (
                    <div key={i} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex justify-between items-center">
                      <div>
                        <div className="font-bold text-gray-800">{p.name}</div>
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                          {p.date} 
                          <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold">{p.time}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => viewOldRecord(p.report || '')}
                        className="px-3 py-1.5 border-2 border-teal-600 text-teal-600 rounded-md text-sm font-semibold hover:bg-teal-50 transition-colors"
                      >
                        View
                      </button>
                    </div>
                  ))}
                  {searchQuery && filteredDb.length === 0 && (
                    <div className="text-center text-gray-500 py-4">No records found.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      case 'new-patient':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xl font-bold text-gray-800">Clinical History</h2>
              <button onClick={confirmWipe} className="bg-red-500 text-white px-3 py-1.5 rounded text-sm font-semibold flex items-center gap-1 hover:bg-red-600">
                <Trash2 size={16} /> Clear Form
              </button>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm mb-5 space-y-4">
              <div>
                <label className="block text-teal-700 font-semibold mb-1.5 text-sm">Serial Number</label>
                <input 
                  type="text" 
                  value={currentPatient.serial}
                  onChange={(e) => handlePatientChange('serial', e.target.value)}
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none" 
                />
              </div>
              <div>
                <label className="block text-teal-700 font-semibold mb-1.5 text-sm">Patient Name</label>
                <input 
                  type="text" 
                  value={currentPatient.name}
                  onChange={(e) => handlePatientChange('name', e.target.value)}
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-teal-700 font-semibold mb-1.5 text-sm">Age</label>
                  <input 
                    type="number" 
                    value={currentPatient.age}
                    onChange={(e) => handlePatientChange('age', e.target.value)}
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-teal-700 font-semibold mb-1.5 text-sm">Sex</label>
                  <select 
                    value={currentPatient.sex}
                    onChange={(e) => handlePatientChange('sex', e.target.value)}
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none bg-white"
                  >
                    <option>Male</option>
                    <option>Female</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-teal-700 font-semibold mb-1.5 text-sm">Main Complaint</label>
                <textarea 
                  rows={2}
                  value={currentPatient.complaint}
                  onChange={(e) => handlePatientChange('complaint', e.target.value)}
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none resize-none" 
                />
              </div>
            </div>
          </div>
        );
      case 'physical':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-xl font-bold text-gray-800 mb-3">Physical Examination</h2>
            <div className="bg-white p-5 rounded-xl shadow-sm mb-5 space-y-5">
              <div>
                <h3 className="font-bold text-gray-700 mb-3">Vital Signs</h3>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="BP (e.g. 120/80)" value={currentPatient.vitals.bp} onChange={(e) => handleVitalChange('bp', e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none" />
                  <input type="text" placeholder="HR (bpm)" value={currentPatient.vitals.hr} onChange={(e) => handleVitalChange('hr', e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none" />
                  <input type="text" placeholder="Temp (°C)" value={currentPatient.vitals.temp} onChange={(e) => handleVitalChange('temp', e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none" />
                  <input type="text" placeholder="RR (/min)" value={currentPatient.vitals.rr} onChange={(e) => handleVitalChange('rr', e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none" />
                </div>
              </div>
              
              <div>
                <label className="block text-teal-700 font-semibold mb-1.5 text-sm">Examination Findings</label>
                <textarea rows={3} value={currentPatient.exam} onChange={(e) => handlePatientChange('exam', e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none resize-none" />
              </div>
              
              <div>
                <label className="block text-orange-600 font-semibold mb-1.5 text-sm">Provisional Diagnosis</label>
                <textarea 
                  rows={2} 
                  placeholder="Enter diagnosis..."
                  value={currentPatient.diagnosis}
                  onChange={(e) => handlePatientChange('diagnosis', e.target.value)}
                  className="w-full p-3 border-2 border-yellow-400 rounded-lg focus:border-orange-500 focus:outline-none resize-none bg-yellow-50/30" 
                />
              </div>
            </div>
          </div>
        );
      case 'investigations':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-xl font-bold text-gray-800 mb-3">Investigations</h2>
            <div className="bg-white p-5 rounded-xl shadow-sm mb-5">
              <label className="block text-teal-700 font-semibold mb-3 text-sm">Lab Results</label>
              <div className="flex gap-3 mb-3">
                <label className="flex-1 bg-teal-50 text-teal-700 py-3 px-4 rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-teal-100 border border-teal-200 transition-colors">
                  <Camera size={24} />
                  <span className="font-semibold text-sm">Take Photo</span>
                  <input type="file" accept="image/*" capture="environment" onChange={(e) => handleImageUpload(e, 'lab')} className="hidden" />
                </label>
                <label className="flex-1 bg-blue-50 text-blue-700 py-3 px-4 rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-blue-100 border border-blue-200 transition-colors">
                  <ImagePlus size={24} />
                  <span className="font-semibold text-sm">Upload File</span>
                  <input type="file" multiple accept="image/*" onChange={(e) => handleImageUpload(e, 'lab')} className="hidden" />
                </label>
              </div>
              <div className="flex flex-wrap gap-3 mt-2">
                {labImages.map((src, i) => (
                  <img key={i} src={src} alt="Lab" className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200 cursor-zoom-in" onClick={() => setFullImage(src)} />
                ))}
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm mb-5">
              <label className="block text-teal-700 font-semibold mb-3 text-sm">Radiology (X-ray/MRI/CT/US)</label>
              <div className="flex gap-3 mb-3">
                <label className="flex-1 bg-teal-50 text-teal-700 py-3 px-4 rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-teal-100 border border-teal-200 transition-colors">
                  <Camera size={24} />
                  <span className="font-semibold text-sm">Take Photo</span>
                  <input type="file" accept="image/*" capture="environment" onChange={(e) => handleImageUpload(e, 'rad')} className="hidden" />
                </label>
                <label className="flex-1 bg-blue-50 text-blue-700 py-3 px-4 rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-blue-100 border border-blue-200 transition-colors">
                  <ImagePlus size={24} />
                  <span className="font-semibold text-sm">Upload File</span>
                  <input type="file" multiple accept="image/*" onChange={(e) => handleImageUpload(e, 'rad')} className="hidden" />
                </label>
              </div>
              <div className="flex flex-wrap gap-3 mt-2">
                {radImages.map((src, i) => (
                  <img key={i} src={src} alt="Radiology" className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200 cursor-zoom-in" onClick={() => setFullImage(src)} />
                ))}
              </div>
            </div>
          </div>
        );
      case 'prescription':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-800 mb-3">Prescription</h2>
              <button onClick={runAISimulation} className="bg-transparent border-2 border-teal-600 text-teal-600 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-teal-50 transition-colors w-full justify-center">
                <Sparkles size={18} /> AI Drug Interaction Check
              </button>
              {aiOutput && (
                <div className="mt-3 p-3 bg-teal-50 border-l-4 border-teal-500 text-teal-800 rounded-r-lg text-sm" dangerouslySetInnerHTML={{__html: aiOutput}}></div>
              )}
            </div>
            
            <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm min-h-[500px] relative">
              <div className="border-b-2 border-gray-800 mb-5 pb-3 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  {clinicLogo && <img src={clinicLogo} alt="Logo" className="max-h-12" />}
                  <div className="font-bold text-lg uppercase tracking-wide">{clinicName}</div>
                </div>
                <div className="text-right text-xs text-gray-600">
                  Date: {new Date().toLocaleDateString()}<br/>
                  Time: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              
              <div className="mb-4 border-b border-gray-100 pb-3 text-sm">
                <b>Patient:</b> {currentPatient.name || '---'} | <b>Age:</b> {currentPatient.age || '--'}<br/>
                <b>Dx:</b> <span className="font-bold text-gray-800">{currentPatient.diagnosis || 'N/A'}</span>
              </div>
              
              <div className="text-4xl text-teal-600 font-serif mb-2">℞</div>
              <textarea 
                value={currentPatient.rx}
                onChange={(e) => handlePatientChange('rx', e.target.value)}
                className="w-full h-64 border-none font-mono text-base resize-none bg-transparent focus:outline-none" 
                placeholder="Treatments..."
              />
            </div>
          </div>
        );
      case 'summary':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-xl font-bold text-gray-800 mb-3">Medical Summary</h2>
            
            <div className="bg-white p-6 rounded-xl shadow-sm mb-5" ref={summaryRef}>
              {viewingOldReport ? (
                <div dangerouslySetInnerHTML={{ __html: viewingOldReport }} />
              ) : (
                <>
                  <div className="flex items-center justify-between border-b-2 border-teal-600 mb-5 pb-3">
                    <div>
                      {clinicLogo ? <img src={clinicLogo} className="max-h-16" alt="Logo" /> : <h2 className="text-xl font-bold">{clinicName}</h2>}
                    </div>
                    <div className="text-right text-sm">
                      <strong>VISIT RECORD</strong><br/>
                      {new Date().toLocaleDateString()} | {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="space-y-3 text-gray-800">
                    <p><b>Patient:</b> {currentPatient.name || 'N/A'} | <b>Age:</b> {currentPatient.age || 'N/A'}</p>
                    <p><b>Complaint:</b> {currentPatient.complaint || 'N/A'}</p>
                    <p><b>Diagnosis:</b> <span className="font-bold text-orange-600">{currentPatient.diagnosis || 'N/A'}</span></p>
                    <p><b>Prescription:</b></p>
                    <pre className="bg-gray-50 p-3 font-mono rounded-lg whitespace-pre-wrap border border-gray-100">{currentPatient.rx || 'None recorded'}</pre>
                  </div>
                </>
              )}
            </div>
            
            <div className="space-y-3">
              <button onClick={downloadPDF} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-colors">
                <Download size={20} /> DOWNLOAD PDF
              </button>
              {!viewingOldReport && (
                <button onClick={finalSave} className="w-full bg-teal-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-teal-700 transition-colors">
                  <Save size={20} /> SAVE TO DATABASE
                </button>
              )}
              {viewingOldReport && (
                <button onClick={() => { setViewingOldReport(null); setActiveTab('home'); }} className="w-full bg-gray-200 text-gray-800 py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-gray-300 transition-colors">
                  BACK TO DASHBOARD
                </button>
              )}
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-xl font-bold text-gray-800 mb-3">Settings & Backup</h2>
            
            <div className="bg-white p-5 rounded-xl shadow-sm mb-5 space-y-4">
              <div>
                <label className="block text-teal-700 font-semibold mb-1.5 text-sm">Clinic Name</label>
                <input 
                  type="text" 
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none" 
                />
              </div>
              <div>
                <label className="block text-teal-700 font-semibold mb-1.5 text-sm">Clinic Logo</label>
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="w-full p-2 border-2 border-gray-200 rounded-lg" />
                {clinicLogo && <img src={clinicLogo} alt="Preview" className="mt-2 max-h-16 rounded border border-gray-200" />}
              </div>
              <button onClick={saveSettings} className="bg-teal-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-teal-700 transition-colors">
                Save Identity
              </button>
            </div>
            
            <div className="bg-white p-5 rounded-xl shadow-sm border-2 border-dashed border-blue-400 space-y-4">
              <button onClick={exportDatabase} className="w-full bg-blue-500 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors">
                <Upload size={20} /> EXPORT BACKUP
              </button>
              
              <div className="pt-2 border-t border-gray-100">
                <label className="block text-gray-600 font-medium mb-2 text-sm">Import Backup (.json)</label>
                <input type="file" accept=".json" onChange={importDatabase} className="w-full p-2 border-2 border-gray-200 rounded-lg mb-3" />
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-800 font-sans selection:bg-teal-200">
      {/* Header */}
      <header className="bg-teal-600 text-white p-4 sticky top-0 z-40 shadow-md flex items-center justify-center gap-3">
        {clinicLogo && <img src={clinicLogo} alt="Logo" className="max-h-8 rounded bg-white/10 p-0.5" />}
        <h1 className="text-lg font-bold tracking-wide">{clinicName}</h1>
      </header>

      {/* Main Content */}
      <main className="p-4 max-w-2xl mx-auto">
        {renderTabContent()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-center z-40 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] overflow-x-auto">
        {[
          { id: 'home', icon: Home, label: 'Home' },
          { id: 'new-patient', icon: User, label: 'Patient' },
          { id: 'physical', icon: Stethoscope, label: 'Exam' },
          { id: 'investigations', icon: FlaskConical, label: 'Labs' },
          { id: 'prescription', icon: Pill, label: 'Rx' },
          { id: 'summary', icon: ClipboardList, label: 'Summary' },
          { id: 'settings', icon: Settings, label: 'Settings' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center p-3 min-w-[64px] transition-colors ${activeTab === tab.id ? 'text-teal-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <tab.icon size={22} className={`mb-1 ${activeTab === tab.id ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            <span className={`text-[10px] ${activeTab === tab.id ? 'font-bold' : 'font-medium'}`}>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Full Image Viewer Modal */}
      {fullImage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setFullImage(null)}>
          <button className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={32} />
          </button>
          <img src={fullImage} alt="Full view" className="max-w-full max-h-[90vh] object-contain rounded-lg" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
