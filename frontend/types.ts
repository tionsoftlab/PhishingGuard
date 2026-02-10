export interface ScanStep {
  id: number;
  label: string;
  status: 'pending' | 'scanning' | 'completed' | 'warning';
  detail?: string;
}

export interface ScanResult {
  url: string;
  score: number;
  riskLevel: 'Safe' | 'Caution' | 'Danger';
  timestamp: string;
}

export interface Post {
  id: string;
  user: string;
  url: string;
  riskLevel: 'Safe' | 'Caution' | 'Danger';
  content: string;
  aiComment?: string;
  expertComment?: string;
  likes: number;
  timestamp: string;
}

export interface Expert {
  id: string;
  name: string;
  specialty: string;
  affiliation: string;
  status: 'online' | 'offline';
  rating: number;
}

export interface ScanStepResult {
    status: 'pending' | 'safe' | 'warning' | 'danger' | 'error';
    message?: string;
    details?: any;
}

export interface APIResult {
    status?: 'safe' | 'warning' | 'danger' | 'unknown' | 'suspicious' | 'SUSPICIOUS' | 'WARNING' | 'DANGER' | 'SAFE' | string;
    final_status?: 'SAFE' | 'WARNING' | 'DANGER' | 'UNKNOWN' | 'SUSPICIOUS' | string;
    score?: number;
    message?: string;
    final_trust_score?: number;
    steps?: {
        step1?: ScanStepResult;
        step2?: ScanStepResult & { ai_analysis?: { reason: string; confidence: number } };
        step2_5?: ScanStepResult;
        step3?: ScanStepResult & { is_valid?: boolean; issuer?: string };
        step4?: ScanStepResult;
        step5?: ScanStepResult;
        step6?: ScanStepResult;
        step7?: ScanStepResult;
        [key: string]: any;
    };
    redirect_chain?: string[];
    rdap_info?: any;
    whois_info?: any;
    google_safe_browsing?: any;
    virustotal?: any;
    phishing_analysis?: any;
    content_comparison?: any;
    scan_type?: 'url' | 'qr' | 'sms' | 'voice' | 'email' | string;
    scan_target?: string;
    easy_summary?: string;
    expert_summary?: string;
    [key: string]: any; 
}