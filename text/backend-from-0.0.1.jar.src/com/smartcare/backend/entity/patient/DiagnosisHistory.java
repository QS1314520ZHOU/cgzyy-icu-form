/*    */ package com.smartcare.backend.entity.patient;
/*    */ 
/*    */ 
/*    */ public class DiagnosisHistory {
/*    */   private Date time;
/*    */   private String editor;
/*    */   
/*  8 */   public void setTime(Date time) { this.time = time; } private String editorId; private String diagnosis; private List<String> diagnosisCodeList; public void setEditor(String editor) { this.editor = editor; } public void setEditorId(String editorId) { this.editorId = editorId; } public void setDiagnosis(String diagnosis) { this.diagnosis = diagnosis; } public void setDiagnosisCodeList(List<String> diagnosisCodeList) { this.diagnosisCodeList = diagnosisCodeList; } public boolean equals(Object o) { if (o == this) return true;  if (!(o instanceof DiagnosisHistory)) return false;  DiagnosisHistory other = (DiagnosisHistory)o; if (!other.canEqual(this)) return false;  Object this$time = getTime(), other$time = other.getTime(); if ((this$time == null) ? (other$time != null) : !this$time.equals(other$time)) return false;  Object this$editor = getEditor(), other$editor = other.getEditor(); if ((this$editor == null) ? (other$editor != null) : !this$editor.equals(other$editor)) return false;  Object this$editorId = getEditorId(), other$editorId = other.getEditorId(); if ((this$editorId == null) ? (other$editorId != null) : !this$editorId.equals(other$editorId)) return false;  Object this$diagnosis = getDiagnosis(), other$diagnosis = other.getDiagnosis(); if ((this$diagnosis == null) ? (other$diagnosis != null) : !this$diagnosis.equals(other$diagnosis)) return false;  Object<String> this$diagnosisCodeList = (Object<String>)getDiagnosisCodeList(), other$diagnosisCodeList = (Object<String>)other.getDiagnosisCodeList(); return !((this$diagnosisCodeList == null) ? (other$diagnosisCodeList != null) : !this$diagnosisCodeList.equals(other$diagnosisCodeList)); } protected boolean canEqual(Object other) { return other instanceof DiagnosisHistory; } public int hashCode() { int PRIME = 59; result = 1; Object $time = getTime(); result = result * 59 + (($time == null) ? 43 : $time.hashCode()); Object $editor = getEditor(); result = result * 59 + (($editor == null) ? 43 : $editor.hashCode()); Object $editorId = getEditorId(); result = result * 59 + (($editorId == null) ? 43 : $editorId.hashCode()); Object $diagnosis = getDiagnosis(); result = result * 59 + (($diagnosis == null) ? 43 : $diagnosis.hashCode()); Object<String> $diagnosisCodeList = (Object<String>)getDiagnosisCodeList(); return result * 59 + (($diagnosisCodeList == null) ? 43 : $diagnosisCodeList.hashCode()); } public String toString() { return "DiagnosisHistory(time=" + getTime() + ", editor=" + getEditor() + ", editorId=" + getEditorId() + ", diagnosis=" + getDiagnosis() + ", diagnosisCodeList=" + getDiagnosisCodeList() + ")"; }
/*    */    public Date getTime() {
/* 10 */     return this.time;
/*    */   } public String getEditor() {
/* 12 */     return this.editor;
/*    */   } public String getEditorId() {
/* 14 */     return this.editorId;
/*    */   } public String getDiagnosis() {
/* 16 */     return this.diagnosis;
/*    */   } public List<String> getDiagnosisCodeList() {
/* 18 */     return this.diagnosisCodeList;
/*    */   }
/*    */ }


/* Location:              E:\深医\医院\重钢医院\AI\backend-from-0.0.1.jar!\com\smartcare\backend\entity\patient\DiagnosisHistory.class
 * Java compiler version: 11 (55.0)
 * JD-Core Version:       1.1.3
 */