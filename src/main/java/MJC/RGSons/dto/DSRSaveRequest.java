package MJC.RGSons.dto;

import java.util.List;

public class DSRSaveRequest {
    private String storeCode;
    private String dsrDate;
    private String userName;
    private List<DSRDetailRequest> details;

    public String getStoreCode() {
        return storeCode;
    }

    public void setStoreCode(String storeCode) {
        this.storeCode = storeCode;
    }

    public String getDsrDate() {
        return dsrDate;
    }

    public void setDsrDate(String dsrDate) {
        this.dsrDate = dsrDate;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public List<DSRDetailRequest> getDetails() {
        return details;
    }

    public void setDetails(List<DSRDetailRequest> details) {
        this.details = details;
    }

    public static class DSRDetailRequest {
        private Integer id; // Optional if we use itemCode/sizeCode
        private String itemCode;
        private String sizeCode;
        private Integer inward;
        private Integer outward;
        private Integer sale;

        public Integer getId() {
            return id;
        }

        public void setId(Integer id) {
            this.id = id;
        }

        public String getItemCode() {
            return itemCode;
        }

        public void setItemCode(String itemCode) {
            this.itemCode = itemCode;
        }

        public String getSizeCode() {
            return sizeCode;
        }

        public void setSizeCode(String sizeCode) {
            this.sizeCode = sizeCode;
        }

        public Integer getInward() {
            return inward;
        }

        public void setInward(Integer inward) {
            this.inward = inward;
        }

        public Integer getOutward() {
            return outward;
        }

        public void setOutward(Integer outward) {
            this.outward = outward;
        }

        public Integer getSale() {
            return sale;
        }

        public void setSale(Integer sale) {
            this.sale = sale;
        }
    }
}
