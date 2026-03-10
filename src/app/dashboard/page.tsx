'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Uploader from '@/components/Uploader';
import ExplainerChat from '@/components/ExplainerChat';
import MedicinesPanel from '@/components/MedicinesPanel';
import { dummyPatients, Patient, MedicalRecord } from '@/data/dummy';
import { supabase } from '@/lib/supabase';

function DashboardContent() {
    const searchParams = useSearchParams();
    const key = searchParams.get('key') || '';
    const router = useRouter();

    // State to hold the actively displayed patient profile
    const [patient, setPatient] = useState<Patient | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [medicines, setMedicines] = useState<any[]>([]);

    useEffect(() => {
        async function fetchPatientData() {
            if (!key) {
                setIsLoading(false);
                return;
            }

            try {
                // First: Attempt to fetch live data from Supabase DB
                const { data: dbPatient, error: dbError } = await supabase
                    .from('patients')
                    .select('*')
                    .eq('unique_key', key)
                    .single();

                if (dbPatient && !dbError) {
                    // Fetch associated medical records
                    const { data: dbRecords } = await supabase
                        .from('medical_records')
                        .select('*')
                        .eq('patient_key', key)
                        .order('created_at', { ascending: false });

                    // Map Supabase response to our unified UI interface
                    setPatient({
                        email: dbPatient.email,
                        uniqueKey: dbPatient.unique_key,
                        name: dbPatient.name,
                        phone: dbPatient.phone_number || '',
                        age: dbPatient.age,
                        bloodType: dbPatient.blood_type,
                        medicalConditions: dbPatient.medical_conditions || [],
                        records: dbRecords || []
                    });
                } else {
                    throw new Error("No live DB patient found"); // Trigger the catch block fallback
                }
            } catch (err) {
                // Fallback 2: Check localStorage for patients registered offline
                const localData = localStorage.getItem(`patient_${key}`);
                if (localData) {
                    try {
                        const p = JSON.parse(localData);
                        setPatient({
                            email: p.email || '',
                            uniqueKey: key,
                            name: p.name || key,
                            phone: p.phone || '',
                            age: p.age || 0,
                            bloodType: p.bloodType || 'Unknown',
                            medicalConditions: p.medicalConditions || [],
                            records: []
                        });
                    } catch { /* corrupted data */ }
                }
                // Fallback 3: Hardcoded demo profiles
                else if (dummyPatients[key]) {
                    setPatient(dummyPatients[key]);
                } else {
                    // Fallback 4: Blank template for brand-new keys
                    setPatient({
                        email: 'live.judge@demo.com',
                        uniqueKey: key,
                        name: 'Live Demo Patient',
                        phone: '',
                        age: 0,
                        bloodType: 'Unknown',
                        medicalConditions: [],
                        records: []
                    });
                }
            } finally {
                setIsLoading(false);
            }
        }
        fetchPatientData();
    }, [key]);

    // Re-fetch ONLY the medical records after a successful upload, updating UI + Chat context
    const refreshRecords = async () => {
        const { data: freshRecords } = await supabase
            .from('medical_records')
            .select('*')
            .eq('patient_key', key)
            .order('created_at', { ascending: false });
        if (freshRecords) {
            setPatient(prev => prev ? { ...prev, records: freshRecords } : prev);
        }
    };

    // Delete a single medical record from Supabase and immediately update local state
    const deleteRecord = async (recordId: string) => {
        // Optimistically remove from UI first for instant feedback
        setPatient(prev => prev ? {
            ...prev,
            records: prev.records.filter((r: MedicalRecord) => r.id !== recordId)
        } : prev);

        // Then delete from Supabase (fire and forget for MVP)
        await supabase.from('medical_records').delete().eq('id', recordId);
    };

    // Delete all patient data — records first (FK constraint), then the patient row
    const deletePatient = async () => {
        const confirmed = window.confirm(
            `⚠️ Delete all data for "${patient?.name}" (${key})?\n\nThis will permanently remove all medical records and the patient profile from the database. This cannot be undone.`
        );
        if (!confirmed) return;

        // 1. Delete all medical records for this patient
        await supabase.from('medical_records').delete().eq('patient_key', key);

        // 2. Delete the patient row itself
        await supabase.from('patients').delete().eq('unique_key', key);

        // 3. Redirect back to login / home
        window.location.href = '/';
    };

    // Delete ALL medical records for this patient only (keeps the patient profile)
    const deleteAllRecords = async () => {
        if (!patient || patient.records.length === 0) return;
        const confirmed = window.confirm(
            `⚠️ Delete all ${patient.records.length} record(s) for "${patient.name}"?\n\nThis cannot be undone.`
        );
        if (!confirmed) return;

        await supabase.from('medical_records').delete().eq('patient_key', key);
        setPatient(prev => prev ? { ...prev, records: [] } : prev);
    };

    if (isLoading) {
        return <div className="app-container"><Header /><main style={{ padding: '24px', textAlign: 'center' }}>Loading Patient Profile...</main></div>;
    }

    if (!patient) {
        return <div className="app-container"><Header /><main style={{ padding: '24px', textAlign: 'center' }}>Initialization Error.</main></div>;
    }

    return (
        <div className="app-container">
            <Header />

            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px' }}>
                {/* Minimal Profile Card — name + actions only */}
                <div className="clinical-card" style={{ background: 'var(--color-primary-light)', borderColor: 'var(--color-primary)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 className="font-bold" style={{ fontSize: '22px', color: 'var(--color-primary)', margin: 0 }}>
                        {patient.name}
                    </h2>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                        <button
                            onClick={() => router.push(`/profile?key=${patient.uniqueKey}`)}
                            style={{
                                padding: '6px 14px', background: 'white',
                                border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-md)',
                                fontSize: '12px', fontWeight: '600', color: 'var(--color-primary)',
                                cursor: 'pointer', transition: 'all 0.15s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-primary)'; e.currentTarget.style.color = 'white'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = 'var(--color-primary)'; }}
                        >
                            👤 View Profile
                        </button>
                        <button
                            onClick={deletePatient}
                            title="Logout"
                            style={{
                                padding: '6px 14px', background: 'rgba(239,68,68,0.08)',
                                border: '1px solid var(--color-error)', borderRadius: 'var(--radius-md)',
                                fontSize: '12px', fontWeight: '600', color: 'var(--color-error)',
                                cursor: 'pointer', transition: 'background 0.15s'
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.18)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                        >
                            🚪 Logout
                        </button>
                    </div>
                </div>

                {/* Live Upload Section */}
                <section style={{ marginTop: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 className="font-bold" style={{ fontSize: '18px' }}>Medical Records</h3>
                        {patient.records.length > 0 && (
                            <button
                                onClick={deleteAllRecords}
                                title="Delete all records"
                                style={{
                                    padding: '6px 12px', background: 'rgba(239,68,68,0.08)',
                                    border: '1px solid var(--color-error)', borderRadius: 'var(--radius-md)',
                                    fontSize: '12px', fontWeight: 'bold', color: 'var(--color-error)',
                                    cursor: 'pointer', transition: 'background 0.15s'
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.18)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                            >
                                🗑 Delete All Records
                            </button>
                        )}
                    </div>
                    <p className="text-muted" style={{ fontSize: '13px', marginBottom: '16px' }}>
                        Upload lab reports (.pdf, .jpg, .png) for instant AI extraction.
                    </p>

                    {/* The Live Upload Button */}
                    <Uploader uniqueKey={patient.uniqueKey} onUploadComplete={refreshRecords} />

                    {/* Records Display */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {patient.records.length > 0 ? (
                            patient.records.map((record: MedicalRecord) => (
                                <div key={record.id} className="clinical-card" style={{ padding: '16px', marginBottom: '0', position: 'relative' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            {record.type}
                                        </span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span className="text-muted" style={{ fontSize: '12px' }}>
                                                {record.date}
                                            </span>
                                            <button
                                                onClick={() => deleteRecord(record.id)}
                                                title="Delete this record"
                                                style={{
                                                    background: 'none', border: 'none', cursor: 'pointer',
                                                    color: 'var(--color-error)', fontSize: '15px',
                                                    padding: '2px 4px', borderRadius: '4px',
                                                    transition: 'background 0.15s',
                                                    lineHeight: 1
                                                }}
                                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
                                                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                            >
                                                🗑
                                            </button>
                                        </div>
                                    </div>
                                    <h4 className="font-bold" style={{ fontSize: '16px', marginBottom: '8px' }}>
                                        {record.title}
                                    </h4>
                                    <p className="text-muted" style={{ fontSize: '14px', lineHeight: '1.4' }}>
                                        {record.summary}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <div className="clinical-card" style={{ textAlign: 'center', padding: '40px 24px', background: 'var(--color-background)' }}>
                                <p className="text-muted" style={{ marginBottom: '16px' }}>No medical records found for this key.</p>
                                <button className="btn-primary" style={{ width: 'auto' }}>
                                    Upload First Document
                                </button>
                            </div>
                        )}
                    </div>
                </section>

                {/* Medicines Tracker */}
                <MedicinesPanel
                    patientKey={patient.uniqueKey}
                    onMedicinesChange={setMedicines}
                />

                {/* Multilingual AI Explainer Chat */}
                <ExplainerChat
                    patientRecordsContext={patient.records}
                    medicinesContext={medicines}
                />
            </main>
        </div>
    );
}

export default function Dashboard() {
    return (
        <Suspense fallback={<div style={{ padding: '24px', textAlign: 'center' }}>Loading...</div>}>
            <DashboardContent />
        </Suspense>
    );
}
