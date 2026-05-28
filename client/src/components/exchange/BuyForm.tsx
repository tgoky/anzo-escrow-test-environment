'use client';

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Search, ChevronDown, Plus, Clock, Check, X } from "lucide-react";
import { CountrySelector } from "@/components/ui/country-selector";
import QuickAmountButtons from "./QuickAmountButtons";
import axios from "axios";
import { WalletDialog } from "./WalletDialog";
import { TransactionProgress } from "./TransactionProgress";
import { TransactionVerification } from './TransactionVerification';
import { motion } from "framer-motion";
import { AccountConnectionDialog } from "@/components/ui/account-connection-dialog";
import type { FinancialAccount } from '@shared/types/financial-account';
import { useFinancialAccountStore } from '@/lib/financialAccountStore';
import { useWalletStore } from '@/lib/walletStore';
import { useToast } from "@/hooks/use-toast";
import { PublicKey, Keypair, Connection, Transaction, SystemProgram } from '@solana/web3.js';
import { Program, BN, AnchorProvider } from "@coral-xyz/anchor";
import * as EscrowClient from '@/lib/contracts/escrow';
import { AnzoEscrow } from '@/types/escrow';
import { useSolanaWallets } from '@privy-io/react-auth/solana';
import { PrimusZKTLS } from '@primuslabs/zktls-js-sdk';

const APP_ID = '0x3416e33be9a4c37a7d31cd0e16cf5783c0f12002';
const BINANCE_P2P_PROFILE_TEMPLATE_ID = '33874dd0-5b70-4c24-a55a-ce6f7193a38d';

interface ExtensionAttestationResult {
 result: boolean;
 data?: any;
 errorData?: {
 code: string;
 desc: string;
 };
}

interface MakerSettings {
 isMaker: boolean;
 pricing: {
 [key: string]: {
 markup: number;
 active: boolean;
 }
 };
 paymentInstructions: string;
}

interface BuyFormProps {
 onAccountConnect: (account: FinancialAccount) => void;
 connectedAccounts?: Array<{ account: FinancialAccount; id: string }>;
 selectedAccountIndex?: number;
 onAccountSelect?: (index: number) => void;
 onAccountDisconnect?: (index: number) => void;
 onStepChange?: (step: 'form' | 'searching' | 'progress' | 'verification' | 'p2p-verification') => void;
 predefinedOffer?: {
 token: string;
 price: string;
 restrictions?: {
 minAmount?: number;
 maxAmount?: number;
 };
 maker: {
 walletAddress: string;
 };
 };
 makerSettings?: MakerSettings;
 onMakerSettingsChange?: (settings: MakerSettings) => void;
}

interface BuyFormData {
 amount: string;
 token: string;
}

const tokens = [
 { symbol: 'USDT', name: 'Tether USD', icon: 'https://assets.coingecko.com/coins/images/325/thumb/Tether.png' },
 { symbol: 'USDC', name: 'USD Coin', icon: 'https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png' },
 { symbol: 'DAI', name: 'Dai', icon: 'https://assets.coingecko.com/coins/images/9956/thumb/4943.png' }
];

export default function BuyForm({
 onAccountConnect,
 connectedAccounts = [],
 selectedAccountIndex = 0,
 onAccountSelect,
 onAccountDisconnect,
 onStepChange,
 predefinedOffer,
 makerSettings,
 onMakerSettingsChange
}: BuyFormProps) {
 const { wallets } = useSolanaWallets();
 const connection = new Connection("http://localhost:8899", {
 commitment: "confirmed",
 });
 const authoritySecretKey = new Uint8Array([143,202,87,145,230,184,50,192,85,179,141,210,151,160,252,11,237,181,189,163,67,115,41,21,224,85,93,106,17,202,174,170,174,37,43,103,182,224,17,111,76,230,188,73,83,203,210,158,59,145,61,211,22,214,54,96,45,126,9,94,184,27,120,55]);
 const authorityKeypair = Keypair.fromSecretKey(authoritySecretKey);
 const [controllerInitialized, setControllerInitialized] = useState<boolean>(false);
 const [program, setProgram] = useState<Program<AnzoEscrow> | null>(null);
 const { toast } = useToast();
 const [isLoading, setIsLoading] = useState(false);
 const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
 const [selectedCurrency, setSelectedCurrency] = useState("USD");
 const [selectedCountryCode, setSelectedCountryCode] = useState("US");
 const [exchangeRate, setExchangeRate] = useState(1);
 const [isConnected, setIsConnected] = useState(false);
 const [isAccountConnected, setIsAccountConnected] = useState(false);
 const [walletDialogOpen, setWalletDialogOpen] = useState(false);
 const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
 const [paymentStep, setPaymentStep] = useState<'select' | 'plaid'>('select');
 const [currentStep, setCurrentStep] = useState<'form' | 'searching' | 'progress' | 'verification' | 'p2p-verification'>('form');
 const [forceUpdateValue, setForceUpdateValue] = useState(0);
 const [counterpartyWallet, setCounterpartyWallet] = useState('');
 const [currentTransactionId, setCurrentTransactionId] = useState<number | null>(null);
 const [formData, setFormData] = useState<BuyFormData | null>(null);

 // Binance P2P Profile Verification States
 const [isSDKInitialized, setIsSDKInitialized] = useState(false);
 const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'verified' | 'failed'>('idle');
 const [verificationError, setVerificationError] = useState<string | null>(null);
 const [profileData, setProfileData] = useState<any>(null);
 const [isTakerInitialized, setIsTakerInitialized] = useState(false);
 const [isKycValid, setIsKycValid] = useState<boolean | null>(null);

 const primusZKTLS = new PrimusZKTLS();

 const { connectedWallet } = useWalletStore();
 const { connectedAccounts: storeConnectedAccounts, selectedAccountIndex: storeSelectedIndex } = useFinancialAccountStore();
 const queryClient = useQueryClient();

 const walletAddress = useMemo(() => 
 wallets[0] ? new PublicKey(wallets[0].address) : null, 
 [wallets]
 );

 // Helper to force re-render
 const forceUpdate = () => {
 console.log('🔄 Forcing component update');
 setForceUpdateValue(prev => prev + 1);
 };

 // Initialize SDK
 useEffect(() => {
 const initSDK = async () => {
 try {
 const result = await primusZKTLS.init(APP_ID);
 console.log('Primus ZKTLS initialized successfully:', result);
 setIsSDKInitialized(primusZKTLS.isInitialized);
 } catch (error: any) {
 console.error('SDK initialization error:', {
 message: error.message,
 code: error.code,
 stack: error.stack,
 });
 setIsSDKInitialized(false);
 toast({
 title: 'Initialization Error',
 description: 'Primus extension not detected. Please ensure it is installed and enabled.',
 variant: 'destructive',
 });
 }
 };
 initSDK();
 }, []);

 // Handle extension messages
 useEffect(() => {
 const handleMessage = (event: MessageEvent) => {
 if (event.origin !== window.location.origin) return;

 if (event.data.target === 'padoZKAttestationJSSDK') {
 const params: ExtensionAttestationResult = event.data.params;
 console.log(`Received ${event.data.name}:`, params);
 if (event.data.name === 'initAttestationRes') {
 console.log('initAttestationRes details:', {
 result: params.result,
 data: params.data,
 isInitialized: primusZKTLS.isInitialized,
 });
 } else if (event.data.name === 'getAttestationRes') {
 if (!params.result && params.errorData) {
 console.error('Attestation error:', params.errorData);
 setVerificationStatus('failed');
 setVerificationError(params.errorData.desc || 'Attestation failed');
 setProfileData(null);
 setIsKycValid(false);
 toast({
 title: 'Verification Error',
 description: params.errorData.desc || 'Attestation failed',
 variant: 'destructive',
 });
 }
 } else if (event.data.name === 'startAttestationRes') {
 if (params.result && params.data) {
 try {
 console.log('Verifying attestation:', params.data);
 const verifyResult = primusZKTLS.verifyAttestation(params.data);
 if (verifyResult) {
 const attestationData = JSON.parse(params.data.data || '{}');
 setProfileData(attestationData);
 const kycStatus = attestationData.kycStatus || 'UNKNOWN';
 if (kycStatus === 'REFUSE') {
 setVerificationStatus('failed');
 setIsKycValid(false);
 toast({
 title: 'KYC Verification Failed',
 description: 'Cannot proceed as a taker. Binance KYC status does not meet requirements.',
 variant: 'destructive',
 });
 } else {
 setVerificationStatus('verified');
 setIsKycValid(true);
 toast({
 title: 'Binance P2P Profile Verified',
 description: `ijsProfile verified successfully for user with KYC Status: ${kycStatus || 'N/A'}`,
 variant: 'default',
 });
 }
 } else {
 throw new Error('Attestation verification failed');
 }
 } catch (error: any) {
 console.error('Attestation verification error:', {
 message: error.message,
 stack: error.stack,
 });
 setVerificationStatus('failed');
 setVerificationError(error.message || 'Verification failed');
 setProfileData(null);
 setIsKycValid(false);
 toast({
 title: 'Verification Error',
 description: error.message || 'Verification failed',
 variant: 'destructive',
 });
 }
 } else if (params.errorData) {
 console.error('Attestation error:', params.errorData);
 setVerificationStatus('failed');
 setVerificationError(params.errorData.desc || 'Attestation failed');
 setProfileData(null);
 setIsKycValid(false);
 toast({
 title: 'Verification Error',
 description: params.errorData.desc || 'Attestation failed',
 variant: 'destructive',
 });
 }
 }
 }

 if (event.data.type === 'BINANCE_P2P_PROFILE_RESULT') {
 console.log('Received BINANCE_P2P_PROFILE_RESULT:', event.data);
 if (event.data.success && event.data.params?.attestation) {
 try {
 const { attestation } = event.data.params;
 console.log('Verifying Binance P2P Profile attestation:', attestation);
 const verifyResult = primusZKTLS.verifyAttestation(attestation);
 if (verifyResult) {
 setProfileData(attestation.verificationValue);
 const kycStatus = attestation.verificationValue.kycStatus || 'UNKNOWN';
 if (kycStatus === 'REFUSE') {
 setVerificationStatus('failed');
 setIsKycValid(false);
 toast({
 title: 'KYC Verification Failed',
 description: 'Cannot proceed as a taker. Binance KYC status does not meet requirements.',
 variant: 'destructive',
 });
 } else {
 setVerificationStatus('verified');
 setIsKycValid(true);
 toast({
 title: 'Binance P2P Profile Verified',
 description: `Profile verified successfully for user with KYC Status: ${kycStatus || 'N/A'}`,
 variant: 'default',
 });
 }
 } else {
 throw new Error('Attestation verification failed');
 }
 } catch (error: any) {
 console.error('Verification error:', {
 message: error.message,
 stack: error.stack,
 });
 setVerificationStatus('failed');
 setVerificationError(error.message || 'Verification failed');
 setProfileData(null);
 setIsKycValid(false);
 toast({
 title: 'Verification Error',
 description: error.message || 'Verification failed',
 variant: 'destructive',
 });
 }
 } else {
 setVerificationStatus('failed');
 setVerificationError(event.data.error || 'Binance P2P Profile verification failed');
 setProfileData(null);
 setIsKycValid(false);
 toast({
 title: 'Verification Error',
 description: event.data.error || 'Binance P2P Profile verification failed',
 variant: 'destructive',
 });
 }
 }
 };

 window.addEventListener('message', handleMessage);
 return () => window.removeEventListener('message', handleMessage);
 }, [formData, toast]);

 const directBinanceP2PProfileVerification = async () => {
 try {
 if (!window.primus) {
 throw new Error('Primus extension not detected. Please install it.');
 }
 console.log('Primus extension detected:', window.primus);

 if (!primusZKTLS.isInitialized) {
 console.log('SDK not initialized, reinitializing...');
 await primusZKTLS.init(APP_ID);
 console.log('SDK reinitialized, isInitialized:', primusZKTLS.isInitialized);
 setIsSDKInitialized(primusZKTLS.isInitialized);
 if (!primusZKTLS.isInitialized) {
 throw new Error('Failed to reinitialize SDK');
 }
 }

 const request = primusZKTLS.generateRequestParams(BINANCE_P2P_PROFILE_TEMPLATE_ID, '0x0000000000000000000000000000000000000000');
 request.setAttMode({
 algorithmType: 'proxytls',
 resultType: 'plain',
 withExtension: true,
 httpRequests: [{
 url: 'https://p2p.binance.com/bapi/c2c/v1/private/c2c/user/profile',
 method: 'GET',
 headers: { 'Content-Type': 'application/json' },
 queryString: '',
 body: {},
 urlType: 'EXACT',
 }],
 });
 request.appId = APP_ID;
 console.log('Generated request params:', request);

 const signResponse = await fetch('/api/sign', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ signParams: JSON.stringify(request) }),
 });

 if (!signResponse.ok) {
 const errorData = await signResponse.json();
 console.error('Sign response error:', errorData);
 throw new Error(errorData.error || 'Failed to sign attestation parameters');
 }

 const { signResult } = await signResponse.json();
 console.log('Received signResult:', signResult);

 if (!signResult.signature || !signResult.requestid) {
 throw new Error('Invalid signResult structure from /api/sign');
 }

 const attestationParams = {
 ...signResult,
 appSignature: signResult.signature,
 };
 console.log('Prepared attestation params:', attestationParams);

 console.log('SDK isInitialized before startAttestation:', primusZKTLS.isInitialized);
 if (!primusZKTLS.isInitialized) {
 throw new Error('SDK not initialized before starting attestation');
 }

 setVerificationStatus('verifying');
 console.log('Starting attestation with params:', attestationParams);
 const attestation = await primusZKTLS.startAttestation(JSON.stringify(attestationParams));
 console.log('Attestation result:', attestation);
 } catch (error: any) {
 console.error('Verification error:', {
 message: error.message,
 code: error.code,
 stack: error.stack,
 data: error.data,
 });
 setVerificationStatus('failed');
 setVerificationError(error.message || 'Verification failed. Please check the console for details.');
 setProfileData(null);
 setIsKycValid(false);
 toast({
 title: 'Verification Error',
 description: error.message || 'Verification failed. Please check the console for details.',
 variant: 'destructive',
 });
 }
 };

 const verifyIdentity = async () => {
 if (!isSDKInitialized) {
 toast({
 title: 'Error',
 description: 'Verification system not initialized',
 variant: 'destructive',
 });
 return;
 }

 setVerificationError(null);
 setProfileData(null);
 setIsKycValid(null);
 await directBinanceP2PProfileVerification();
 };

 useEffect(() => {
 const savedAccountInfo = localStorage.getItem('connectedFinancialAccount');
 const savedAccountDetails = localStorage.getItem('financialAccountInfo');
 if (savedAccountInfo && savedAccountDetails) {
 setIsAccountConnected(true);
 }
 }, []);

 useEffect(() => {
 const accountsExist = storeConnectedAccounts && storeConnectedAccounts.length > 0;
 setIsAccountConnected(accountsExist);
 }, [storeConnectedAccounts]);

 useEffect(() => {
 if (connectedWallet) {
 console.log('🔄 Wallet connected from store:', connectedWallet);
 setIsConnected(true);
 } else {
 console.log('⚠️ No wallet connected in store');
 setIsConnected(false);
 }
 }, [connectedWallet]);

 useEffect(() => {
 const storedTxId = localStorage.getItem('currentTransactionId');
 console.log('🔍 Checking for stored transaction ID:', storedTxId);

 if (storedTxId) {
 const checkTransaction = async () => {
 try {
 console.log('🔄 Fetching transaction details for ID:', storedTxId);
 const { data: tx } = await axios.get(`/api/transactions/${storedTxId}`);
 console.log('✅ Retrieved transaction:', tx);

 if (tx) {
 setCurrentTransactionId(parseInt(storedTxId));
 console.log('📊 Current transaction status:', tx.status);

 if (tx.status === 'searching') {
 console.log('🔄 Setting step to searching and starting polling');
 setCurrentStep('searching');
 pollTransaction(parseInt(storedTxId));
 } else if (tx.status === 'pending') {
 console.log('🔄 Setting step to verification for pending transaction');
 setCurrentStep('verification');
 } else if (tx.status === 'verification') {
 console.log('🔄 Setting step to verification');
 setCurrentStep('verification');
 } else if (tx.status === 'matched') {
 console.log('🔄 Setting counterparty wallet and step to progress for matched transaction');
 setCounterpartyWallet(tx.counterpartyAddress);
 setCurrentStep('progress');
 } else {
 console.log('ℹ️ Transaction in state that doesn\'t trigger UI change:', tx.status);
 }
 } else {
 console.log('⚠️ No transaction data found for ID:', storedTxId);
 }
 } catch (error) {
 console.error('❌ Error restoring transaction:', error);
 localStorage.removeItem('currentTransactionId');
 }
 };
 checkTransaction();
 } else {
 console.log('ℹ️ No stored transaction ID found in localStorage');
 }
 }, []);

 const pollTransaction = (txId: number) => {
 console.log('🔄 Starting to poll transaction:', txId);
 
 localStorage.setItem('currentTransactionId', txId.toString());
 
 const intervalId = setInterval(async () => {
 try {
 console.log('🔄 Polling transaction:', txId);
 const { data } = await axios.get(`/api/debug/transaction/${txId}`);
 const updatedTx = data.transaction;
 
 console.log('📊 Transaction status from polling:', updatedTx?.status);
 console.log('📊 Full transaction data:', data);

 const isMatched = updatedTx && 
 updatedTx.status && 
 updatedTx.status .toLowerCase() === 'matched';

 if (updatedTx && updatedTx.status === 'searching') {
 console.log('🔍 Transaction still searching...');
 } else if (isMatched) {
 console.log('✅ Transaction matched during polling, updating UI');
 clearInterval(intervalId);

 if (updatedTx.counterpartyAddress) {
 setCounterpartyWallet(updatedTx.counterpartyAddress);
 console.log('✅ Set counterparty wallet to:', updatedTx.counterpartyAddress);
 } else {
 console.warn('⚠️ Matched transaction missing counterparty address');
 }

 window.setTimeout(() => {
 setCurrentStep('progress');
 if (onStepChange) {
 console.log('🔄 Notifying parent component of progress step');
 onStepChange('progress');
 }
 }, 50);

 setTimeout(() => {
 console.log('🔍 Verifying current step after update:', currentStep);
 if (currentStep !== 'progress') {
 console.log('⚠️ Direct state correction needed');
 setCurrentStep('progress');
 if (onStepChange) onStepChange('progress');
 forceUpdate();
 }
 }, 500);
 }
 } catch (error) {
 console.error('❌ Error polling transaction:', error);
 }
 }, 2000);

 setTimeout(() => {
 console.log('⏱️ Polling timeout reached, stopping poll');
 clearInterval(intervalId);
 }, 120000);
 };

 const { register, setValue, handleSubmit, watch } = useForm<BuyFormData>({
 defaultValues: {
 amount: "100",
 token: predefinedOffer?.token || "USDT"
 }
 });

 const amount = watch("amount");
 const token = watch("token");
 const selectedToken = tokens.find(t => t.symbol === token);

 useEffect(() => {
 if (selectedCurrency !== "USD") {
 const fetchRate = async () => {
 try {
 const response = await axios.get(`https://open.er-api.com/v6/latest/USD`);
 const rate = response.data.rates[selectedCurrency];
 setExchangeRate(rate || 1);
 } catch (error) {
 console.error("Failed to fetch exchange rate:", error);
 setExchangeRate(1);
 }
 };
 fetchRate();
 } else {
 setExchangeRate(1);
 }
 }, [selectedCurrency]);

 const initializeProgram = () => {
 if (!wallets[0]) {
 console.error('No wallet connected');
 return null;
 }
 
 try {
 const newProgram = EscrowClient.initializeConnection(connection, wallets[0]);
 setProgram(newProgram);
 return newProgram;
 } catch (error) {
 console.error("Error initializing program:", error);
 return null;
 }
 };

 const checkControllerExists = async () => {
 if (!program) return false;
 
 try {
 const [controllerPda] = PublicKey.findProgramAddressSync(
 [Buffer.from("CONTROLLER")], 
 program.programId
 );
 
 const controllerAccount = await connection.getAccountInfo(controllerPda);
 const exists = !!controllerAccount;
 setControllerInitialized(exists);
 return exists;
 } catch (error) {
 console.error("Error checking controller:", error);
 return false;
 }
 };

 const initializeControllerIfNeeded = async () => {
 const programInstance = program || initializeProgram();
 if (!programInstance) {
 throw new Error('Failed to initialize program');
 }
 
 const exists = await checkControllerExists();
 if (exists) {
 console.log('✅ Controller already initialized');
 setControllerInitialized(true);
 return;
 }
 
 console.log('🔄 Initializing controller...');
 
 try {
 const instruction = await EscrowClient.initializeController(
 programInstance, 
 authorityKeypair.publicKey, 
 authorityKeypair.publicKey
 );
 
 let tx = new Transaction().add(instruction);
 tx.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
 tx.feePayer = authorityKeypair.publicKey;
 
 tx.sign(authorityKeypair);
 const signature = await connection.sendTransaction(tx, [authorityKeypair]);
 await connection.confirmTransaction(signature, 'confirmed');
 
 console.log("✅ Controller initialized with signature:", signature);
 setControllerInitialized(true);
 } catch (error: any) {
 console.error("❌ Error initializing controller:", error);
 if (error.logs) {
 console.error("Transaction logs:", error.logs);
 }
 throw error;
 }
 };

 const initializeTakerIfNeeded = async (walletAddress: string) => {
 const programInstance = program || initializeProgram();
 if (!programInstance) {
 throw new Error('Failed to initialize program');
 }
 
 if (!controllerInitialized) {
 await initializeControllerIfNeeded();
 }
 
 try {
 const walletPubKey = new PublicKey(walletAddress);
 
 const [takerPda] = PublicKey.findProgramAddressSync(
 [Buffer.from("TAKER"), walletPubKey.toBuffer()], 
 programInstance.programId
 );
 
 const takerAccount = await connection.getAccountInfo(takerPda);
 if (takerAccount) {
 console.log('✅ Taker account already exists');
 setIsTakerInitialized(true);
 return;
 }
 
 console.log('🔄 Initializing new taker account...');
 
 const encoder = new TextEncoder();
 const dataBytes = encoder.encode('Default Taker');
 const paddedData = new Uint8Array(256);
 paddedData.set(dataBytes.slice(0, 256));
 
 const [controllerPda] = PublicKey.findProgramAddressSync(
 [Buffer.from("CONTROLLER")], 
 programInstance.programId
 );
 
 const tx = await programInstance.methods
 .initializeTaker(Array.from(paddedData))
 .accounts({
 authority: authorityKeypair.publicKey,
 payer: walletPubKey,
 controller: controllerPda,
 takerAuthority: walletPubKey,
 taker: takerPda,
 systemProgram: SystemProgram.programId,
 })
 .transaction();
 
 tx.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
 tx.feePayer = walletPubKey;
 
 tx.partialSign(authorityKeypair);
 const signature = await wallets[0].sendTransaction(tx, connection);
 await connection.confirmTransaction(signature, 'confirmed');
 
 console.log("✅ Taker initialized with signature:", signature);
 setIsTakerInitialized(true);
 } catch (error: any) {
 console.error("❌ Error initializing taker:", error);
 if (error.logs) {
 console.error("Transaction logs:", error.logs);
 }
 throw error;
 }
 };

 const createTransaction = async (data: BuyFormData) => {
 console.log('🔵 Creating transaction with data:', data);
 setIsLoading(true);

 try {
 console.log('🔍 Checking financial account store for wallet:', connectedWallet);
 console.log('Store accounts:', storeConnectedAccounts);
 console.log('Selected index:', storeSelectedIndex);

 const currentAccount = connectedAccounts && connectedAccounts.length > 0 && selectedAccountIndex !== undefined
 ? connectedAccounts[selectedAccountIndex]
 : null;

 console.log('🔍 Directly connected account from props:', currentAccount);

 let accountInfo;

 if (!currentAccount) {
 console.log('ℹ️ No account provided from props, looking in store');
 const walletAccounts = storeConnectedAccounts?.filter(account => {
 return account.account.metadata?.walletAddress === connectedWallet;
 }) || [];

 console.log('🔍 Accounts for this wallet from store:', walletAccounts);

 if (walletAccounts.length === 0) {
 console.log('❌ No accounts associated with this wallet, showing payment dialog');
 setPaymentStep('select');
 setPaymentDialogOpen(true);
 setIsLoading(false);
 return;
 }

 const selectedWalletAccount = walletAccounts.find((_, index) => index === storeSelectedIndex) || walletAccounts[0];

 if (!selectedWalletAccount) {
 console.log('❌ Selected account not found for this wallet, showing payment dialog');
 setPaymentStep('select');
 setPaymentDialogOpen(true);
 setIsLoading(false);
 return;
 }

 console.log('🔍 Selected account from store:', selectedWalletAccount);
 accountInfo = selectedWalletAccount.account;
 console.log('✅ Account info from store:', accountInfo);
 } else {
 accountInfo = currentAccount.account;
 console.log('✅ Account info from props:', accountInfo);
 }

 let paymentMethod = accountInfo.metadata?.preferredPaymentMethod;
 
 console.log('🏦 Account info for payment method:', accountInfo);
 console.log('💳 Institution details:', accountInfo.institution);
 console.log('🔍 Account preferred payment method:', paymentMethod);
 
 if (!paymentMethod) {
 paymentMethod = getPaymentMethodForCurrency(selectedCurrency, accountInfo);
 console.log('💰 Detected payment method:', paymentMethod);
 } else {
 console.log('💰 Using stored preferred payment method:', paymentMethod);
 }

 const takerFinancialAccountData = {
 accountId: accountInfo.id,
 institution: accountInfo.institution,
 mask: accountInfo.mask,
 accountType: accountInfo.accountType,
 accountSubtype: accountInfo.accountSubtype,
 accountName: accountInfo.accountName,
 currency: accountInfo.currency || selectedCurrency,
 status: accountInfo.status || 'active'
 };

 console.log('📝 Taker financial account data:', takerFinancialAccountData);
 
 const takerFinancialAccountString = JSON.stringify(takerFinancialAccountData);
 console.log('📝 Stringified taker account data:', takerFinancialAccountString);

 const transaction = {
 type: 'buy',
 amount: data.amount.replace(/,/g, ''),
 currency: selectedCurrency,
 tokenAmount: selectedCurrency === "USD"
 ? data.amount.replace(/,/g, '')
 : (parseFloat(data.amount.replace(/,/g, '')) / exchangeRate).toString(),
 token: data.token,
 walletAddress: connectedWallet,
 takerFinancialAccount: takerFinancialAccountString,
 takerPaymentMethod: paymentMethod,
 timeoutAt: new Date(Date.now() + 5 * 60000).toISOString(),
 status: 'searching',
 makerAddress: predefinedOffer?.maker?.walletAddress,
 countryCode: selectedCountryCode,
 allowSelfMatch: true,
 p2pProfileData: profileData
 };

 console.log('📝 Creating transaction with payment method:', paymentMethod);
 console.log('📝 Using account with ID:', accountInfo.id);
 console.log('📝 Account preferred payment method:', accountInfo.metadata?.preferredPaymentMethod);
 console.log('📝 Final takerPaymentMethod in transaction:', transaction.takerPaymentMethod);
 console.log('📝 P2P Profile data:', profileData);
 console.log('📝 Full transaction data:', JSON.stringify(transaction, null, 2));

 try {
 console.log('📤 Sending transaction to API:', transaction);
 const response = await axios.post('/api/transactions', transaction);
 console.log('✅ Transaction response:', response.data);

 if (!response.data || !response.data.id) {
 console.error('❌ Transaction response missing ID:', response.data);
 throw new Error('Transaction response missing ID');
 }
 
 console.log('🔄 Setting current step to searching after successful transaction creation');
 setCurrentStep('searching');
 if (onStepChange) {
 onStepChange('searching');
 }

 const txId = response.data.id;
 console.log('🔑 Setting currentTransactionId to:', txId);
 setCurrentTransactionId(txId);
 localStorage.setItem('currentTransactionId', txId.toString());

 console.log('✅ Transaction created successfully, now in searching state');
 pollTransaction(txId);

 } catch (error: any) {
 console.error('❌ Error creating transaction:', error);
 console.error('❌ Error details:', error.response?.data || error.message);
 
 setCurrentStep('form');
 if (onStepChange) {
 onStepChange('form');
 }
 
 toast({
 title: "Transaction Failed",
 description: "Unable to create transaction. Please try again.",
 variant: "destructive"
 });
 }
 } catch (error: any) {
 console.error('❌ Failed to create transaction:', error);
 if (error.response) {
 console.error('❌ Error response data:', error.response.data);
 console.error('❌ Error response status:', error.response.status);
 console.error('❌ Error response headers:', error.response.headers);
 } else if (error.request) {
 console.error('❌ Error request:', error.request);
 } else {
 console.error('❌ Error message:', error.message);
 }
 } finally {
 console.log('🏁 Transaction creation complete, setting isLoading to false');
 setIsLoading(false);
 setFormData(null);
 }
 };

 const handleFormSubmit = async (data: BuyFormData) => {
 console.log('🔵 handleFormSubmit called with data:', data);
 setIsLoading(true);

 if (!connectedWallet) {
 console.log('❌ No connected wallet found, showing wallet dialog');
 setWalletDialogOpen(true);
 setIsLoading(false);
 return;
 }
 console.log('✅ Connected wallet:', connectedWallet);

 try {
 if (!program) {
 initializeProgram();
 }
 await initializeTakerIfNeeded(connectedWallet);
 toast({
 title: "Taker Initialization for this wallet",
 description: "Success",
 variant: "default"
 });
 setFormData(data);
 setCurrentStep('p2p-verification');
 } catch (error: any) {
 console.error('❌ Failed to initialize taker:', error);
 toast({
 title: "Taker Initialization Failed",
 description: "Unable to initialize your wallet as a taker. Please try again.",
 variant: "destructive"
 });
 } finally {
 setIsLoading(false);
 }
 };

 const handleVerificationComplete = async () => {
 if (currentTransactionId) {
 try {
 const response = await axios.get(`/api/transactions/by-id/${currentTransactionId}`);
 const transaction = response.data;
 
 console.log("✅ Transaction verification complete:", transaction);
 
 if (transaction?.token && transaction.token !== token) {
 console.log(`📝 Updating token symbol from ${token} to ${transaction.token}`);
 setValue("token", transaction.token);
 }
 
 await axios.patch(`/api/transactions/${currentTransactionId}`, {
 status: 'completed'
 });
 
 if (connectedWallet) {
 await queryClient.invalidateQueries({
 queryKey: ['transactions', connectedWallet]
 });
 }
 
 toast({
 title: "Transaction Complete",
 description: `Your purchase of ${token} was successful!`,
 variant: "default"
 });
 } catch (error) {
 console.error('Failed to update transaction status:', error);
 toast({
 title: "Error Completing Transaction",
 description: "There was an error finalizing your transaction. Please contact support.",
 variant: "destructive"
 });
 }
 setCurrentStep('form');
 }
 };

 const handleBack = () => {
 setCurrentStep('form');
 };

 const handleProceed = () => {
 if (!formData) {
 toast({
 title: 'Error',
 description: 'No transaction data available. Please try again.',
 variant: 'destructive',
 });
 return;
 }

 if (!isKycValid) {
 toast({
 title: 'KYC Verification Required',
 description: 'Cannot proceed as a taker. Binance KYC status does not meet requirements.',
 variant: 'destructive',
 });
 return;
 }

 createTransaction(formData);
 };

 const handleQuickAmountSelect = (amount: string) => {
 setValue("amount", amount);
 };

 const walletStore = useWalletStore();

 const handleWalletConnect = (publicKey: string) => {
 console.log('🔑 Connecting wallet with public key:', publicKey);
 localStorage.setItem('walletPublicKey', publicKey);
 setIsConnected(true);
 
 walletStore.setConnectedWallet(publicKey);
 
 console.log('✅ Wallet connected:', publicKey);
 console.log('💾 Wallet saved to localStorage');
 };

 const handleDisconnect = () => {
 localStorage.removeItem('walletPublicKey');
 setIsConnected(false);
 
 walletStore.setConnectedWallet(null);
 };

 const handleAccountConnect = (account: FinancialAccount) => {
 console.log('🔵 handleAccountConnect called with account:', account);
 setIsAccountConnected(true);
 onAccountConnect(account);
 setPaymentDialogOpen(false);

 console.log('🔍 Connected accounts array:', connectedAccounts);
 if (onAccountSelect && connectedAccounts) {
 const newIndex = connectedAccounts.length - 1;
 console.log('✅ Selecting new account at index:', newIndex);
 onAccountSelect(newIndex);
 }

 if (connectedWallet) {
 console.log('✅ Setting current step to form');
 setCurrentStep('form');
 }
 };

 const handlePaymentConfirmed = async (txId: number) => {
 if (txId === currentTransactionId) {
 try {
 console.log('📤 Marking payment as confirmed for transaction:', txId);
 console.log('🔑 Connected wallet from store:', connectedWallet);
 
 if (!connectedWallet) {
 const walletFromStorage = localStorage.getItem('walletPublicKey');
 console.log('⚠️ No wallet in store, trying localStorage:', walletFromStorage);
 
 if (!walletFromStorage) {
 throw new Error('No wallet connected. Please connect your wallet and try again.');
 }
 
 walletStore.setConnectedWallet(walletFromStorage);
 }
 
 const walletToUse = connectedWallet || localStorage.getItem('walletPublicKey');
 console.log('🔑 Using wallet:', walletToUse);
 
 const evidenceUrl = `/api/transactions/${txId}/evidence`;
 console.log('🔍 Submitting payment evidence to URL:', evidenceUrl);
 
 const evidenceResponse = await axios.post(evidenceUrl, {
 evidence: {
 type: "payment_made",
 timestamp: new Date().toISOString(),
 walletAddress: walletToUse,
 details: {
 status: "completed",
 method: "bank_transfer"
 }
 }
 });
 
 console.log('✅ Payment evidence recorded successfully:', evidenceResponse.data);
 
 const approvalUrl = `/api/transactions/${txId}/approval`;
 console.log('🔍 Submitting transaction approval to URL:', approvalUrl);
 
 const approvalResponse = await axios.patch(approvalUrl, {
 approvalType: 'taker',
 approved: true,
 reason: 'Payment confirmed by buyer'
 });
 
 console.log('✅ Transaction marked as approved by taker:', approvalResponse.data);
 
 const statusResponse = await axios.patch(`/api/transactions/${txId}`, {
 status: 'verification'
 });
 
 console.log('✅ Transaction status updated to verification:', statusResponse.data);
 
 setCurrentStep('verification');
 } catch (error: any) {
 console.error('❌ Error recording payment evidence:', error);
 console.error('❌ Error details:', error.response?.data || error.message);
 
 toast({
 title: "Error Recording Payment",
 description: error.response?.data?.message || error.message || "There was an error recording your payment. Please try again.",
 variant: "destructive"
 });
 
 setCurrentStep('progress');
 }
 }
 };

 const truncateAddress = (address: string) => {
 if (!address) return "";
 return `${address.slice(0, 6)}...${address.slice(-4)}`;
 };

 const getPaymentMethodForCurrency = (currency: string, accountInfo: any) => {
 console.log('🏦 Getting payment method for currency:', currency);
 console.log('📊 Full account info:', JSON.stringify(accountInfo, null, 2));

 switch (currency) {
 case "USD":
 const hasZelle = accountInfo?.institution?.capabilities?.includes?.("zelle") || 
 accountInfo?.capabilities?.includes?.("zelle") ||
 (accountInfo?.paymentMethods || []).includes("zelle");

 console.log('🔍 Checking Zelle capability:', {
 institution: accountInfo?.institution,
 capabilities: accountInfo?.institution?.capabilities,
 hasZelle: hasZelle
 });

 return hasZelle === true ? "zelle" : "ach";
 case "EUR":
 return "sepa";
 case "GBP":
 return "faster_payments";
 case "MXN":
 return "spei";
 case "BRL":
 return "pix";
 default:
 return "wire";
 }
 };

 const handleCurrencyChange = (newCurrency: string, countryCode?: string) => {
 if (newCurrency === selectedCurrency) {
 return;
 }
 setSelectedCurrency(newCurrency);
 if (countryCode) {
 setSelectedCountryCode(countryCode);
 }
 };

 useEffect(() => {
 if (onStepChange) {
 onStepChange(currentStep);
 }
 }, [currentStep, onStepChange]);

 useEffect(() => {
 console.log('🔍 Current step is now:', currentStep);
 if (currentStep === 'searching') {
 console.log('⏱️ In searching state, currentTransactionId:', currentTransactionId);
 }

 if (onStepChange) {
 console.log('🔄 Syncing parent component with current step:', currentStep);
 onStepChange(currentStep);
 }

 if (currentTransactionId) {
 console.log('🔄 Saving transaction ID to localStorage:', currentTransactionId);
 localStorage.setItem('currentTransactionId', currentTransactionId.toString());

 if (currentStep === 'progress') {
 console.log('📊 In progress step - ensuring UI reflects this state');
 }
 }
 }, [currentStep, currentTransactionId, onStepChange]);

 const tokenDialogEnabled = !predefinedOffer;

 return (
 <>
 {currentStep === 'verification' ? (
 <TransactionVerification
 amount={parseFloat(amount.replace(/,/g, ''))}
 recipientWallet={counterpartyWallet}
 tokenSymbol={token}
 transactionId={currentTransactionId}
 onComplete={handleVerificationComplete}
 onBack={handleBack}
 />
 ) : currentStep === 'progress' ? (
 <TransactionProgress
 amount={amount}
 currentTransactionId={currentTransactionId!}
 onConfirmPayment={handlePaymentConfirmed}
 onBack={handleBack}
 />
 ) : currentStep === 'searching' ? (
 <div className="flex flex-col items-center justify-center p-8 space-y-4">
 <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center">
 <Clock className="w-8 h-8 text-violet-500 animate-spin" />
 </div>
 <h3 className="text-xl font-medium text-gray-700">Finding a Seller</h3>
 <p className="text-gray-500 text-center max-w-[300px]">
 Please wait while we match you with a seller. This usually takes less than a minute.
 </p>
 </div>
 ) : currentStep === 'p2p-verification' ? (
 <Card className="bg-white shadow-sm p-4">
 <div className="flex flex-col items-center justify-center p-8 space-y-4">
 {/* <h2 className="text-xl text-gray-600 font-normal">Binance P2P Profile Verification</h2> */}
 <Button
 onClick={verifyIdentity}
 disabled={verificationStatus === 'verifying' || !isSDKInitialized}
 className={`w-full h-14 text-lg rounded-full ${verificationStatus === 'verifying' ? 'verifying' : ''}`}
 >
 {verificationStatus === 'verifying' ? (
 <span className="flex items-center">
 <Clock className="w-5 h-5 mr-2 animate-spin" />
 Verifying...
 </span>
 ) : (
 'Verify Binance P2P Profile'
 )}
 </Button>
 {(verificationStatus === 'verified' || (verificationStatus === 'failed' && profileData)) && (
 <div className="verified-status text-left w-full">
 <div className="flex items-center mb-4">
 {verificationStatus === 'verified' ? (
 <>
 <Check className="w-5 h-5 text-green-500 mr-2" />
 <p className="text-gray-600">Profile verified successfully!</p>
 </>
 ) : (
 <>
 <X className="w-5 h-5 text-red-500 mr-2" />
 <p className="text-gray-600">Profile verification failed</p>
 </>
 )}
 </div>
 <p><strong>KYC Status:</strong> {profileData.kycStatus || 'N/A'}</p>
 <p><strong>User Grade:</strong> {profileData.userGrade || 'N/A'}</p>
 <p><strong>Order Count:</strong> {profileData.orderCount || '0'}</p>
 <p><strong>Ad Confirmation Time:</strong> {profileData.advConfirmTime || '0'} seconds</p>
 <p><strong>KYC Verified:</strong> {profileData.kycVerified ? 'Yes' : 'No'}</p>
 <p><strong>KYC Type:</strong> {profileData.kycType || 'N/A'}</p>
 <p><strong>Avg Release Time (30 days):</strong> {profileData.avgReleaseTimeOfLatest30day || '0'} seconds</p>
 <p><strong>Finish Rate (30 days):</strong> {(profileData.finishRateLatest30day * 100) || '0'}%</p>
 <p><strong>Completed Orders (30 days):</strong> {profileData.completedOrderNumOfLatest30day || '0'}</p>
 <p><strong>Completed Buy Orders (30 days):</strong> {profileData.completedBuyOrderNumOfLatest30day || '0'}</p>
 <p><strong>Completed Sell Orders (30 days):</strong> {profileData.completedSellOrderNumOfLatest30day || '0'}</p>
 <p><strong>Over Complained:</strong> {profileData.overComplained || '0'}</p>
 <p><strong>Online Status:</strong> {profileData.onlineStatus || 'N/A'}</p>
 <p><strong>VIP Level:</strong> {profileData.vipLevel || 'N/A'}</p>
 <p><strong>Trade Order Count:</strong> {profileData.tradeOrderCount || '0'}</p>
 <p><strong>Last Active Time:</strong> {profileData.lastActiveTime ? new Date(profileData.lastActiveTime).toLocaleString() : 'N/A'}</p>
 {verificationStatus === 'failed' && (
 <div className="flex items-center mt-4">
 <X className="w-5 h-5 text-red-500 mr-2" />
 <p className="text-red-600">Cannot proceed as a taker. Binance KYC status does not meet requirements.</p>
 </div>
 )}
 <div className="flex gap-4 mt-4">
 <Button
 variant="outline"
 onClick={() => setCurrentStep('form')}
 className="w-full h-12 text-lg rounded-full border-gray-300"
 >
 Back
 </Button>
 <Button
 onClick={handleProceed}
 className="w-full h-12 text-lg rounded-full"
 disabled={!formData || !isKycValid || verificationStatus !== 'verified'}
 >
 Proceed
 </Button>
 </div>
 </div>
 )}
 {verificationStatus === 'failed' && !profileData && (
 <div className="flex items-center">
 <X className="w-5 h-5 text-red-500 mr-2" />
 <p className="text-red-600">{verificationError || 'Verification failed'}</p>
 </div>
 )}
 {verificationStatus !== 'verified' && verificationStatus !== 'failed' && (
 <Button
 variant="outline"
 onClick={() => setCurrentStep('form')}
 className="w-full h-12 text-lg rounded-full border-gray-300"
 >
 Back
 </Button>
 )}
 </div>
 <Dialog
 open={verificationStatus === 'verifying'}
 onOpenChange={(open: boolean) => {
 if (!open) {
 setVerificationStatus('idle');
 setVerificationError(null);
 setProfileData(null);
 setIsKycValid(null);
 }
 }}
 >
 <DialogContent className="p-6" aria-describedby="dialog-description">
 <DialogHeader>
 <DialogTitle className="text-xl font-medium">Binance P2P Profile Verification</DialogTitle>
 </DialogHeader>
 <div id="dialog-description" className="sr-only">
 Dialog for displaying the status of Binance P2P Profile verification process
 </div>
 <div className="flex flex-col items-center space-y-4">
 <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center">
 <Clock className="w-8 h-8 text-violet-500 animate-spin" />
 </div>
 <p className="text-gray-500 text-center">Please complete verification in the popup window</p>
 </div>
 </DialogContent>
 </Dialog>
 </Card>
 ) : (
 <div className="space-y-4">
 <Card className="bg-white shadow-sm p-4">
 <div className="flex gap-2 mb-4 border-b pb-4">
 <button
 className="px-4 py-2 rounded-lg bg-accent/20 text-accent font-medium"
 >
 Buy
 </button>
 <button
 className="px-4 py-2 rounded-lg text-gray-400 font-medium cursor-not-allowed flex items-center gap-2"
 disabled
 >
 Sell
 <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">Coming soon</span>
 </button>
 </div>
 <div className="flex justify-between items-center mb-4">
 <h2 className="text-xl text-gray-600 font-normal">You're buying</h2>
 <CountrySelector
 onCountrySelect={({ currency, code }) => handleCurrencyChange(currency, code)}
 selectedCountryCode={selectedCountryCode}
 triggerClassName="w-[130px]"
 />
 </div>
 <form
 onSubmit={(e) => {
 e.preventDefault();
 handleSubmit(handleFormSubmit)(e);
 }}
 className="space-y-8"
 >
 <div className="space-y-2">
 <div className="relative w-full border-none">
 <Input
 {...register("amount")}
 className ="text-5xl h-20 font-['Poppins'] font-black border-none text-center bg-transparent pl-0 pr-0 text-transparent touch-manipulation focus:ring-black focus:ring-[3px]"
 inputMode="decimal"
 type="text"
 onChange={(e) => {
 const value = e.target.value.replace(/[^\d.]/g, '');
 const formattedValue = Number(value).toLocaleString();
 setValue("amount", formattedValue);
 }}
 />
 <div className="absolute inset-0 pointer-events-none font-bold flex items-center justify-center">
 <span className={`inline-flex items-center ${
 watch("amount").length > 8
 ? 'text-4xl'
 : watch("amount").length > 6
 ? 'text-5xl'
 : 'text-6xl'
 } leading-none`}>
 <span className="mr-1">
 {(() => {
 switch (selectedCurrency) {
 case "USD": return "$";
 case "EUR": return "€";
 case "GBP": return "£";
 case "JPY": return "¥";
 case "CNY": return "¥";
 case "KRW": return "₩";
 case "INR": return "₹";
 case "RUB": return "₽";
 case "BRL": return "R$";
 default: return selectedCurrency;
 }
 })()}
 </span>
 {parseFloat(amount.replace(/,/g, '')).toLocaleString(undefined, { maximumFractionDigits: 2 })}
 </span>
 </div>
 </div>

 <div className="flex items-center justify-center gap-2 mt-8 mb-6">
 <Button
 type="button"
 variant="ghost"
 onClick={() => setTokenDialogOpen(true)}
 className="flex items-center gap-2 text-gray-600 hover:text-gray-800 bg-gray-200 hover:bg-gray-300 rounded-full px-4 py-2"
 disabled={!tokenDialogEnabled}
 >
 <img src={selectedToken?.icon} alt={selectedToken?.name} className="w-6 h-6" />
 <span>{(parseFloat(amount.replace(/,/g, '')) / exchangeRate).toLocaleString(undefined, { maximumFractionDigits: 2 })} {token}</span>
 <ChevronDown className="h-4 w-4 ml-1" />
 </Button>
 </div>

 <div className="mt-8">
 <QuickAmountButtons
 selectedAmount={amount}
 onSelect={handleQuickAmountSelect}
 />
 </div>

 <div className="mt-8">
 <Button
 type="submit"
 className="w-full h-14 text-lg rounded-full"
 disabled={isLoading || !parseFloat(amount.replace(/,/g, ''))}
 variant={isConnected ? "default" : "secondary"}
 >
 {isLoading ? "Processing..." : "Continue"}
 </Button>
 </div>
 </div>
 </form>

 <Dialog open={tokenDialogOpen} onOpenChange={setTokenDialogOpen}>
 <DialogContent className="p-0">
 <Command className="rounded-lg border shadow-md">
 <CommandInput placeholder="Search tokens..." className="h-12" />
 <CommandEmpty>No tokens found.</CommandEmpty>
 <CommandGroup>
 {tokens.map((token) => (
 <CommandItem
 key={token.symbol}
 onSelect={() => {
 setValue("token", token.symbol);
 setTokenDialogOpen(false);
 }}
 className="flex items-center gap-2 p-4"
 >
 <img src={token.icon} alt={token.name} className="w-6 h-6" />
 <div>
 <div className="font-medium">{token.symbol}</div>
 <div className="text-sm text-gray-500">{token.name}</div>
 </div>
 </CommandItem>
 ))}
 </CommandGroup>
 </Command>
 </DialogContent>
 </Dialog>

 <WalletDialog
 open={walletDialogOpen}
 onOpenChange={setWalletDialogOpen}
 onConnect={handleWalletConnect}
 />

 <AccountConnectionDialog
 open={paymentDialogOpen}
 onClose={() => setPaymentDialogOpen(false)}
 onOpenChange={setPaymentDialogOpen}
 onAccountConnect={handleAccountConnect}
 walletAddress={connectedWallet || ''}
 source="buyForm"
 preselectedCurrency={selectedCurrency}
 />
 </Card>
 </div>
 )}
 </>
 );
}