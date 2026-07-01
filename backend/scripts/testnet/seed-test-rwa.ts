import 'dotenv/config';
import axios from 'axios';

// ============================================================
// ARIA Demo Script: Seed a realistic trade finance RWA
// 
// This submits a $50K USD invoice from a Singaporean textile
// exporter to a German buyer (60-day term) and prints a live
// log of each agent completing analysis.
// ============================================================

const API_BASE = `http://localhost:${process.env.PORT ?? 3001}/api`;

const SAMPLE_INVOICE = {
  assetType: 'INVOICE',
  ownerPublicKey: '017bfb2a0f49c2d09c5a24b7b05c2c0d18f5c5c1d18f5c5c1d18f5c5c1d18f5c5',
  faceValue: 50000,
  currency: 'USD',
  invoiceNumber: 'SG-TEX-2026-00142',
  issuerName: 'Singapore Textile Exports Pte Ltd',
  issuerCountry: 'SG',
  issuerRegistrationNumber: '202312345A',
  buyerName: 'Deutsche Textilhandel GmbH',
  buyerCountry: 'DE',
  buyerRegistrationNumber: 'HRB 123456',
  issueDate: new Date().toISOString(),
  dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
  description: 'Textile export invoice: 2,000 units premium cotton fabric shipped via sea freight (BL: SGDE2026-00142). FOB Singapore, CIF Hamburg.',
};

async function connectSSE(rwaId: string): Promise<() => void> {
  return new Promise((resolve) => {
    const EventSource = require('eventsource');
    const es = new EventSource(`${API_BASE}/sse/events`);

    const cleanup = () => es.close();

    es.onmessage = (event: { data: string }) => {
      try {
        const data = JSON.parse(event.data);
        if (!data.rwaId || data.rwaId !== rwaId) return;

        switch (data.type) {
          case 'AGENT_STARTED':
            console.log(`  [${new Date().toLocaleTimeString()}] 🔄 ${data.agentId?.toUpperCase() ?? 'AGENT'} agent: ${data.data.stage}`);
            break;
          case 'AGENT_COMPLETED':
            console.log(`  [${new Date().toLocaleTimeString()}] ✓  ${data.agentId?.toUpperCase() ?? 'AGENT'} agent: ${data.data.vote} (confidence: ${((data.data.confidence ?? 0) * 100).toFixed(0)}%)`);
            break;
          case 'VOTE_CAST':
            console.log(`  [${new Date().toLocaleTimeString()}] 🗳️  Vote on-chain: ${data.agentId} → ${data.data.vote} (tx: ${String(data.data.txHash).substring(0, 20)}...)`);
            break;
          case 'CONSENSUS_REACHED':
            console.log(`\n  [${new Date().toLocaleTimeString()}] 🏛️  COUNCIL DECISION: ${data.data.approved ? '✅ APPROVED' : '❌ REJECTED'}`);
            console.log(`  Weighted Score: ${((data.data.weightedScore ?? 0) * 100).toFixed(1)}%`);
            console.log(`  Memo: ${data.data.memo}`);
            break;
          case 'NFT_MINTED':
            console.log(`\n  [${new Date().toLocaleTimeString()}] 🎨 RWA NFT Minted!`);
            console.log(`  Token ID: ${data.data.nftTokenId}`);
            console.log(`  Tx Hash: ${data.data.mintTxHash}`);
            cleanup();
            resolve(cleanup);
            break;
          case 'PIPELINE_STATUS':
            if (data.data.status === 'REJECTED') {
              cleanup();
              resolve(cleanup);
            }
            break;
        }
      } catch {
        // Ignore parse errors
      }
    };

    // Auto-close after 3 minutes
    setTimeout(() => {
      cleanup();
      resolve(cleanup);
    }, 180_000);
  });
}

async function main() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║          ARIA — Trade Finance Demo Submission          ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Instrument Details:');
  console.log(`  Type:     ${SAMPLE_INVOICE.assetType}`);
  console.log(`  Value:    ${SAMPLE_INVOICE.faceValue.toLocaleString()} ${SAMPLE_INVOICE.currency}`);
  console.log(`  Issuer:   ${SAMPLE_INVOICE.issuerName} (${SAMPLE_INVOICE.issuerCountry})`);
  console.log(`  Buyer:    ${SAMPLE_INVOICE.buyerName} (${SAMPLE_INVOICE.buyerCountry})`);
  console.log(`  Term:     60 days`);
  console.log(`  Invoice:  ${SAMPLE_INVOICE.invoiceNumber}`);
  console.log('');

  // Check health first
  try {
    const health = await axios.get(`${API_BASE}/health`);
    console.log(`System Status: ${health.data.data.status}`);
    console.log('');
  } catch {
    console.error('❌ Backend not running. Start with: npm run dev');
    process.exit(1);
  }

  // Submit RWA
  console.log('Submitting RWA...');
  let rwaId: string;

  try {
    const response = await axios.post(`${API_BASE}/rwa/submit`, SAMPLE_INVOICE);
    rwaId = response.data.data.id;
    console.log(`✓ Submitted! RWA ID: ${rwaId}`);
    console.log('');
    console.log('Live Agent Activity:');
    console.log('─'.repeat(55));
  } catch (err) {
    if (axios.isAxiosError(err)) {
      console.error(`❌ Submission failed: ${JSON.stringify(err.response?.data)}`);
    } else {
      console.error(`❌ Error: ${(err as Error).message}`);
    }
    process.exit(1);
  }

  // Subscribe to SSE events
  await connectSSE(rwaId);

  // Final status check
  console.log('');
  console.log('─'.repeat(55));
  try {
    const statusResponse = await axios.get(`${API_BASE}/rwa/${rwaId}`);
    const status = statusResponse.data.data;
    console.log(`Final Status: ${status.status}`);
    if (status.riskScore) console.log(`Risk Score (PD): ${(status.riskScore * 100).toFixed(2)}%`);
    if (status.valuationNpv) console.log(`Valuation NPV: $${status.valuationNpv?.toLocaleString()}`);
    if (status.complianceClearance) console.log(`Compliance: ${status.complianceClearance}`);
    if (status.nftTokenId) console.log(`NFT Token ID: ${status.nftTokenId}`);
  } catch {
    // ignore
  }

  console.log('');
  console.log('View full details: ' + `${API_BASE}/rwa/${rwaId}`);
  console.log('View agent votes: ' + `${API_BASE}/rwa/${rwaId}/votes`);
  console.log('');
}

main().catch(console.error);
