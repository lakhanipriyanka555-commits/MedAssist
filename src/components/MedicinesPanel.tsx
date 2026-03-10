'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Medicine {
    id: string;
    name: string;
    dosage: string;
    frequency: string;
}

interface MedicinesPanelProps {
    patientKey: string;
    onMedicinesChange?: (medicines: Medicine[]) => void;
}

export default function MedicinesPanel({ patientKey, onMedicinesChange }: MedicinesPanelProps) {
    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [name, setName] = useState('');
    const [dosage, setDosage] = useState('');
    const [frequency, setFrequency] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Load medicines on mount
    useEffect(() => {
        const fetchMedicines = async () => {
            const { data } = await supabase
                .from('medicines')
                .select('*')
                .eq('patient_key', patientKey)
                .order('created_at', { ascending: true });
            if (data) {
                setMedicines(data);
                onMedicinesChange?.(data);
            }
        };
        fetchMedicines();
    }, [patientKey]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setIsSaving(true);

        // First ensure patient exists (same FK guard as file upload)
        await supabase.from('patients').upsert([{
            unique_key: patientKey,
            name: `Patient (${patientKey})`,
            email: `${patientKey.toLowerCase()}@medassist.demo`,
            age: 0, blood_type: 'Unknown'
        }], { onConflict: 'unique_key', ignoreDuplicates: true });

        const { data: newMed, error } = await supabase
            .from('medicines')
            .insert([{ patient_key: patientKey, name: name.trim(), dosage: dosage.trim(), frequency: frequency.trim() }])
            .select()
            .single();

        if (newMed && !error) {
            const updated = [...medicines, newMed];
            setMedicines(updated);
            onMedicinesChange?.(updated);
        }

        setName(''); setDosage(''); setFrequency('');
        setIsAdding(false);
        setIsSaving(false);
    };

    const handleDelete = async (id: string) => {
        await supabase.from('medicines').delete().eq('id', id);
        const updated = medicines.filter(m => m.id !== id);
        setMedicines(updated);
        onMedicinesChange?.(updated);
    };

    const inputStyle: React.CSSProperties = {
        padding: '8px 12px', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)', fontSize: '14px',
        background: 'var(--color-surface)', outline: 'none', flex: 1,
    };

    return (
        <div style={{ marginTop: '32px', borderTop: '2px solid var(--color-border)', paddingTop: '24px' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                    <h3 className="font-bold" style={{ fontSize: '18px' }}>💊 Current Medicines</h3>
                    <p className="text-muted" style={{ fontSize: '13px' }}>Medications you are currently taking</p>
                </div>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        style={{
                            padding: '8px 16px', background: 'var(--color-primary)', color: 'white',
                            border: 'none', borderRadius: 'var(--radius-full)', fontWeight: '600',
                            fontSize: '13px', cursor: 'pointer'
                        }}
                    >
                        + Add Medicine
                    </button>
                )}
            </div>

            {/* Add Medicine Form */}
            {isAdding && (
                <form onSubmit={handleAdd} style={{ background: 'var(--color-primary-light)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '16px', border: '1px solid var(--color-primary)' }}>
                    <p className="font-bold" style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--color-primary)' }}>New Medicine</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <input style={inputStyle} placeholder="Medicine name (e.g. Metformin) *" value={name} onChange={e => setName(e.target.value)} required />
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input style={inputStyle} placeholder="Dosage (e.g. 500mg)" value={dosage} onChange={e => setDosage(e.target.value)} />
                            <input style={inputStyle} placeholder="Frequency (e.g. Twice daily)" value={frequency} onChange={e => setFrequency(e.target.value)} />
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button type="submit" disabled={isSaving} style={{ padding: '8px 20px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-full)', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
                                {isSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button type="button" onClick={() => setIsAdding(false)} style={{ padding: '8px 20px', background: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)', fontSize: '13px', cursor: 'pointer' }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* Medicines List */}
            {medicines.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {medicines.map(med => (
                        <div key={med.id} className="clinical-card" style={{ padding: '12px 16px', marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <p className="font-bold" style={{ fontSize: '15px' }}>💊 {med.name}</p>
                                <p className="text-muted" style={{ fontSize: '13px', marginTop: '2px' }}>
                                    {[med.dosage, med.frequency].filter(Boolean).join(' · ') || 'No dosage details'}
                                </p>
                            </div>
                            <button
                                onClick={() => handleDelete(med.id)}
                                title="Remove medicine"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-error)', fontSize: '16px', padding: '4px 8px', borderRadius: '4px' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                            >
                                🗑
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                !isAdding && (
                    <div style={{ textAlign: 'center', padding: '24px', background: 'var(--color-background)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border)' }}>
                        <p className="text-muted" style={{ fontSize: '14px' }}>No medicines added yet. Add your current medications above.</p>
                    </div>
                )
            )}
        </div>
    );
}
