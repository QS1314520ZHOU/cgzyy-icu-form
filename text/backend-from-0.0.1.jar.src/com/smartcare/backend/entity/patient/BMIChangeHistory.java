/*    */ package com.smartcare.backend.entity.patient;
/*    */ public class BMIChangeHistory {
/*    */   private Date date;
/*    */   private String height;
/*    */   private String weight;
/*    */   
/*  7 */   public void setDate(Date date) { this.date = date; } private String oneMonthWeight; private String twoMonthWeight; private String threeMonthWeight; public void setHeight(String height) { this.height = height; } public void setWeight(String weight) { this.weight = weight; } public void setOneMonthWeight(String oneMonthWeight) { this.oneMonthWeight = oneMonthWeight; } public void setTwoMonthWeight(String twoMonthWeight) { this.twoMonthWeight = twoMonthWeight; } public void setThreeMonthWeight(String threeMonthWeight) { this.threeMonthWeight = threeMonthWeight; } public boolean equals(Object o) { if (o == this) return true;  if (!(o instanceof BMIChangeHistory)) return false;  BMIChangeHistory other = (BMIChangeHistory)o; if (!other.canEqual(this)) return false;  Object this$date = getDate(), other$date = other.getDate(); if ((this$date == null) ? (other$date != null) : !this$date.equals(other$date)) return false;  Object this$height = getHeight(), other$height = other.getHeight(); if ((this$height == null) ? (other$height != null) : !this$height.equals(other$height)) return false;  Object this$weight = getWeight(), other$weight = other.getWeight(); if ((this$weight == null) ? (other$weight != null) : !this$weight.equals(other$weight)) return false;  Object this$oneMonthWeight = getOneMonthWeight(), other$oneMonthWeight = other.getOneMonthWeight(); if ((this$oneMonthWeight == null) ? (other$oneMonthWeight != null) : !this$oneMonthWeight.equals(other$oneMonthWeight)) return false;  Object this$twoMonthWeight = getTwoMonthWeight(), other$twoMonthWeight = other.getTwoMonthWeight(); if ((this$twoMonthWeight == null) ? (other$twoMonthWeight != null) : !this$twoMonthWeight.equals(other$twoMonthWeight)) return false;  Object this$threeMonthWeight = getThreeMonthWeight(), other$threeMonthWeight = other.getThreeMonthWeight(); return !((this$threeMonthWeight == null) ? (other$threeMonthWeight != null) : !this$threeMonthWeight.equals(other$threeMonthWeight)); } protected boolean canEqual(Object other) { return other instanceof BMIChangeHistory; } public int hashCode() { int PRIME = 59; result = 1; Object $date = getDate(); result = result * 59 + (($date == null) ? 43 : $date.hashCode()); Object $height = getHeight(); result = result * 59 + (($height == null) ? 43 : $height.hashCode()); Object $weight = getWeight(); result = result * 59 + (($weight == null) ? 43 : $weight.hashCode()); Object $oneMonthWeight = getOneMonthWeight(); result = result * 59 + (($oneMonthWeight == null) ? 43 : $oneMonthWeight.hashCode()); Object $twoMonthWeight = getTwoMonthWeight(); result = result * 59 + (($twoMonthWeight == null) ? 43 : $twoMonthWeight.hashCode()); Object $threeMonthWeight = getThreeMonthWeight(); return result * 59 + (($threeMonthWeight == null) ? 43 : $threeMonthWeight.hashCode()); } public String toString() { return "BMIChangeHistory(date=" + getDate() + ", height=" + getHeight() + ", weight=" + getWeight() + ", oneMonthWeight=" + getOneMonthWeight() + ", twoMonthWeight=" + getTwoMonthWeight() + ", threeMonthWeight=" + getThreeMonthWeight() + ")"; }
/*    */    public Date getDate() {
/*  9 */     return this.date;
/*    */   } public String getHeight() {
/* 11 */     return this.height;
/*    */   } public String getWeight() {
/* 13 */     return this.weight;
/*    */   } public String getOneMonthWeight() {
/* 15 */     return this.oneMonthWeight;
/*    */   } public String getTwoMonthWeight() {
/* 17 */     return this.twoMonthWeight;
/*    */   } public String getThreeMonthWeight() {
/* 19 */     return this.threeMonthWeight;
/*    */   }
/*    */ }


/* Location:              E:\深医\医院\重钢医院\AI\backend-from-0.0.1.jar!\com\smartcare\backend\entity\patient\BMIChangeHistory.class
 * Java compiler version: 11 (55.0)
 * JD-Core Version:       1.1.3
 */