'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  CreditCard,
  Send,
  ShieldCheck,
  Landmark,
  CheckCircle,
  Zap,
  Loader2,
} from 'lucide-react';
import { parseInvoiceDocument, submitRwa } from '@/lib/api';
import { setObservatoryFocus } from '@/lib/observatory-focus';
import { useUiStore } from '@/store/ui.store';
import { useWallet } from '@/hooks/useWallet';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/cn';
import type { RwaSubmitInput } from '@/types/api.types';

const CURRENCIES = ['USD', 'EUR', 'SGD', 'GBP'] as const;

async function fileSha256(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

interface RwaSubmitFormProps {
  onSubmitted?: (rwaId: string, payload: RwaSubmitInput) => void;
}

export function RwaSubmitForm({ onSubmitted }: RwaSubmitFormProps) {
  const router = useRouter();
  const { address } = useWallet();
  const { addToast, removeToast } = useUiStore();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [counterpartyName, setCounterpartyName] = useState('');
  const [counterpartyJurisdiction, setCounterpartyJurisdiction] = useState('');
  const [faceValue, setFaceValue] = useState<number>(35000);
  const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>('USD');
  const [maturityDate, setMaturityDate] = useState('2026-08-31');
  const [description, setDescription] = useState('');
  const [documentHash, setDocumentHash] = useState<string | null>(null);

  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const applyQuickSample = async (
    counterparty: string,
    jurisdiction: string,
    amt: number,
    curr: (typeof CURRENCIES)[number],
    maturity: string,
  ) => {
    setCounterpartyName(counterparty);
    setCounterpartyJurisdiction(jurisdiction);
    setFaceValue(amt);
    setCurrency(curr);
    setMaturityDate(maturity);
    setDescription(`Demo invoice — ${counterparty}`);
    const file = new File(
      [`demo-invoice-${counterparty}`],
      `invoice_${counterparty.toLowerCase().replace(/\s+/g, '_')}.pdf`,
      { type: 'application/pdf' },
    );
    setUploadedFile(file);
    setDocumentHash(await fileSha256(file));
  };

  const processFile = async (file: File) => {
    setUploadedFile(file);
    setParsing(true);
    try {
      const parsed = await parseInvoiceDocument(file);
      setDocumentHash(parsed.documentHash);
      setCounterpartyName(parsed.counterpartyName);
      setCounterpartyJurisdiction(parsed.counterpartyJurisdiction);
      setFaceValue(parsed.faceValue > 0 ? parsed.faceValue : faceValue);
      if (CURRENCIES.includes(parsed.currency as (typeof CURRENCIES)[number])) {
        setCurrency(parsed.currency as (typeof CURRENCIES)[number]);
      }
      setMaturityDate(parsed.maturityDate);
      if (parsed.description) setDescription(parsed.description);
      addToast({
        type: 'success',
        message: `Document parsed · ${Math.round(parsed.confidence * 100)}% confidence`,
      });
    } catch (e) {
      const hash = await fileSha256(file);
      setDocumentHash(hash);
      addToast({
        type: 'info',
        message: `Parse unavailable — using manual fields. Hash: ${hash.slice(0, 8)}…`,
      });
    } finally {
      setParsing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void processFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void processFile(file);
  };

  const canSubmit =
    Boolean(counterpartyName && counterpartyJurisdiction && uploadedFile && documentHash) &&
    faceValue > 0 &&
    !parsing &&
    !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !address || !documentHash) {
      if (!address) addToast({ type: 'error', message: 'Please connect your wallet first' });
      return;
    }

    setSubmitting(true);
    const pendingToastId = addToast({ type: 'pending', message: 'Submitting to AI Underwriting Council…' });
    try {
      const payload: RwaSubmitInput = {
        ownerPublicKey: address,
        assetType: 'INVOICE',
        faceValue: String(faceValue),
        currency,
        maturityDate,
        counterpartyName,
        counterpartyJurisdiction,
        description: description || `Commercial invoice — ${counterpartyName}`,
        documentHash,
      };
      const result = await submitRwa(payload);
      removeToast(pendingToastId);
      addToast({ type: 'success', message: 'Submitted · Agent council is convening…' });
      queryClient.invalidateQueries({ queryKey: ['rwas'] });
      onSubmitted?.(result.id, payload);
      if (!onSubmitted) {
        setObservatoryFocus(result.id, payload);
        router.push(`/observatory?rwaId=${encodeURIComponent(result.id)}`);
      }
    } catch (err) {
      removeToast(pendingToastId);
      addToast({ type: 'error', message: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8" id="submit-container">
      {/* Page Header */}
      <div>
        <div className="flex items-center space-x-2 text-xs font-mono text-teal-400 uppercase tracking-widest mb-1">
          <span>SME CAPITAL GATEWAY</span>
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
        </div>
        <h2 className="text-2xl font-bold text-text-primary">Invoice Underwriting Console</h2>
        <p className="text-sm text-text-secondary font-light mt-1">
          Upload commercial invoices to invoke the ARIA AI Council. Approved assets are instantly funded and tokenized as CEP-78 NFTs.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Form */}
        <div className="lg:col-span-2 space-y-6">
          <form
            onSubmit={handleSubmit}
            className="p-6 rounded-2xl border border-violet-500/10 bg-bg-card/50 space-y-6"
            id="underwriting-form"
          >
            <h3 className="text-base font-semibold text-text-primary flex items-center space-x-2 pb-3 border-b border-violet-500/10">
              <CreditCard className="w-[18px] h-[18px] text-violet-400" />
              <span>Asset Financing Request</span>
            </h3>

            {/* Quick Demo Seeds */}
            <div>
              <span className="block text-[11px] font-mono text-text-muted uppercase tracking-wider mb-2.5">
                QUICK POPULATE HACKATHON DEMO SAMPLES
              </span>
              <div className="grid sm:grid-cols-3 gap-2">
                {[
                  { name: 'Acme Corp Ltd', amt: 48000, curr: 'USD' as const, mat: '2026-08-15' },
                  { name: 'Global Logistics', amt: 72000, curr: 'USD' as const, mat: '2026-09-30' },
                  { name: 'Nova Biotech', amt: 15000, curr: 'SGD' as const, mat: '2026-07-25' },
                ].map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => void applyQuickSample(s.name, 'Singapore (SG)', s.amt, s.curr, s.mat)}
                    className="p-2.5 rounded-lg border border-violet-500/10 bg-bg-deep/60 hover:bg-bg-card-hover text-[11px] text-text-secondary font-mono transition-colors text-left flex items-center justify-between group"
                  >
                    <div>
                      <span className="text-teal-400 font-bold block group-hover:text-teal-300 transition-colors">
                        {s.name}
                      </span>
                      <span>
                        {s.amt >= 1000 ? `${Math.round(s.amt / 1000)}K` : s.amt} {s.curr}
                      </span>
                    </div>
                    <Zap className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-mono text-text-secondary uppercase tracking-wider">
                  Counterparty Name
                </label>
                <input
                  type="text"
                  required
                  value={counterpartyName}
                  onChange={(e) => setCounterpartyName(e.target.value)}
                  placeholder="e.g. Acme Corp Ltd"
                  className="w-full bg-bg-deep/80 border border-violet-500/10 px-4 py-2.5 rounded-lg text-sm text-text-primary focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-mono text-text-secondary uppercase tracking-wider">
                  Jurisdiction
                </label>
                <input
                  type="text"
                  required
                  value={counterpartyJurisdiction}
                  onChange={(e) => setCounterpartyJurisdiction(e.target.value)}
                  placeholder="e.g. Singapore (SG)"
                  className="w-full bg-bg-deep/80 border border-violet-500/10 px-4 py-2.5 rounded-lg text-sm text-text-primary focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-mono text-text-secondary uppercase tracking-wider">
                  Face Value ({currency})
                </label>
                <div className="relative flex">
                  <input
                    type="number"
                    required
                    min={1}
                    value={faceValue}
                    onChange={(e) => setFaceValue(Number(e.target.value))}
                    placeholder="e.g. 50000"
                    className="w-full bg-bg-deep/80 border border-violet-500/10 pl-4 pr-16 py-2.5 rounded-lg text-sm font-mono text-text-primary focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                  />
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as (typeof CURRENCIES)[number])}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-teal-400 font-mono font-bold bg-transparent border-0 focus:outline-none cursor-pointer"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c} className="bg-bg-card text-text-primary">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-mono text-text-secondary uppercase tracking-wider">
                  Maturity Date
                </label>
                <input
                  type="date"
                  required
                  value={maturityDate}
                  onChange={(e) => setMaturityDate(e.target.value)}
                  className="w-full bg-bg-deep/80 border border-violet-500/10 px-4 py-2.5 rounded-lg text-sm font-mono text-text-primary focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                />
              </div>
            </div>

            {/* Invoice Dropzone */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono text-text-secondary uppercase tracking-wider">
                COMMERCIAL INVOICE DOCUMENT (PDF / XML)
              </label>
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => !parsing && fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300',
                  parsing ? 'cursor-wait' : 'cursor-pointer',
                  dragActive
                    ? 'border-teal-400 bg-teal-500/10'
                    : uploadedFile
                      ? 'border-emerald-500/50 bg-emerald-500/5'
                      : 'border-violet-500/10 bg-bg-deep/30 hover:bg-bg-card-hover hover:border-violet-500/30',
                )}
                id="invoice-dropzone"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.xml,.json,application/pdf,application/xml,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {parsing ? (
                  <div className="space-y-2">
                    <Loader2 className="w-8 h-8 text-teal-400 animate-spin mx-auto" />
                    <span className="text-xs text-teal-400 font-mono block">Parsing document with AI…</span>
                  </div>
                ) : uploadedFile ? (
                  <div className="space-y-2">
                    <div className="mx-auto w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/35">
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <span className="font-mono text-xs text-text-primary block truncate max-w-xs mx-auto">
                        {uploadedFile.name}
                      </span>
                      <span className="text-[10px] text-text-muted font-mono">
                        {(uploadedFile.size / 1024).toFixed(1)} KB
                        {documentHash ? ` · hash ${documentHash.slice(0, 8)}…` : ''}
                        {' · '}Click to replace
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="mx-auto w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                      <Upload className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <span className="text-xs text-text-primary font-medium block">
                        Drag & Drop or <span className="text-teal-400 underline">Click to Upload</span>
                      </span>
                      <span className="text-[10px] text-text-muted block font-mono mt-1">
                        Supports PDF, e-Invoicing XML, or JSON schemas up to 10MB
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {!address && (
              <p className="text-xs text-amber-400 font-mono text-center">
                Connect your wallet to submit to the underwriting council.
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit || !address}
              className={cn(
                'w-full py-3.5 rounded-xl font-semibold flex items-center justify-center space-x-2 shadow-lg transition-all transform duration-300',
                canSubmit && address
                  ? 'bg-gradient-to-r from-violet-600 to-teal-500 hover:from-violet-500 hover:to-teal-400 text-white cursor-pointer hover:-translate-y-0.5 shadow-violet-500/20 hover:shadow-violet-500/35'
                  : 'bg-bg-deep border border-violet-500/10 text-text-muted cursor-not-allowed',
              )}
              id="submit-underwrite-btn"
            >
              {submitting ? (
                <Loader2 className="w-[18px] h-[18px] animate-spin" />
              ) : (
                <Send className="w-[18px] h-[18px]" />
              )}
              <span>{submitting ? 'Submitting…' : 'Submit to AI Underwriting Council'}</span>
            </button>
          </form>
        </div>

        {/* Right: Educational */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-violet-500/10 bg-bg-card/30 space-y-4">
            <h4 className="font-semibold text-text-primary flex items-center space-x-2 text-sm">
              <Landmark className="w-[18px] h-[18px] text-teal-400" />
              <span>Consensus Rules & Parameters</span>
            </h4>
            <p className="text-xs text-text-secondary leading-relaxed font-light">
              Once submitted, your invoice undergoes real-time logical review. Four specialized agents inspect risks, verifying compliance against OFAC indices and rating credit indexes.
            </p>
            <div className="space-y-3.5 pt-2">
              <div className="flex items-start space-x-3 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0" />
                <div>
                  <span className="text-text-primary font-medium block">3-of-4 Signature Threshold</span>
                  <span className="text-text-muted text-[11px]">
                    Consensus requires at least 3 agent approvals to trigger multi-sig.
                  </span>
                </div>
              </div>
              <div className="flex items-start space-x-3 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0" />
                <div>
                  <span className="text-text-primary font-medium block">Cryptographic CEP-78 Mint</span>
                  <span className="text-text-muted text-[11px]">
                    Approved assets are tokenized, registering legal title natively on Casper.
                  </span>
                </div>
              </div>
              <div className="flex items-start space-x-3 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                <div>
                  <span className="text-text-primary font-medium block">x402 Micropayment Ingress</span>
                  <span className="text-text-muted text-[11px]">
                    Agents pay tiny Gas/CSPR micropayments to fetch oracle API records.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-violet-500/10 bg-gradient-to-b from-violet-950/20 to-transparent flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h5 className="font-semibold text-xs text-text-primary">Casper Security Guaranteed</h5>
              <p className="text-[11px] text-text-muted leading-normal font-light">
                Underwriting code, financial records, and reputation tracking is validated directly in public smart contracts on Casper Network, preventing data manipulation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
