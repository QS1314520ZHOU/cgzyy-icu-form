export interface Account {
  id?: string;
  username?: string;
  trueName?: string;
  profession?: string;
  departmentCode?: string;
  signPicID?: string;
  signPicType?: string;
  permissionDtoList?: any[];
  [key: string]: any;
}

export interface Patient {
  // 关键字段
  id?: string;
  mrn?: string;
  hisPid?: string;
  name?: string;
  gender?: string;
  age?: number;
  childAge?: number;
  admissionAge?: number;
  hisBed?: string;
  showBed?: string;
  dept?: string;
  deptCode?: string;
  status?: string;
  clinicalDiagnosis?: string;
  admissionDiagnosis?: string;
  icuAdmissionTime?: number;
  bedDoctorId?: string;
  bedDoctor?: string;
  treatedDoctor?: string;
  insuranceType?: string;

  // 时间字段
  admissionTime?: number;
  bedTime?: number;
  birthday?: number;
  createdTime?: number;
  hisAdmissionTime?: number;

  // 嵌套对象
  doctorQuality?: any;
  permissionDtoList?: any[];

  [key: string]: any;
}

export interface SmartCareData {
  type?: string;
  account: Account;
  patient: Patient;
  token?: string;
}

export interface LogEntry {
  time: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface ConnectionState {
  type: 'waiting' | 'received' | 'cached' | 'error';
  text: string;
}

// 兼容旧代码的类型别名
export type ConnectionStatus = 'waiting' | 'from-cache' | 'connected' | 'origin-rejected';
