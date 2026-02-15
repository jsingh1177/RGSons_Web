package MJC.RGSons.dto;

import java.util.HashMap;
import java.util.Map;

public class CollectionExpenseDTO {
    private String district;
    private String storeName;
    private Map<String, Double> tenders = new HashMap<>();
    private Map<String, Double> expenses = new HashMap<>();
    private Map<String, Double> sales = new HashMap<>();

    public CollectionExpenseDTO() {}

    public CollectionExpenseDTO(String district, String storeName) {
        this.district = district;
        this.storeName = storeName;
    }

    public String getDistrict() {
        return district;
    }

    public void setDistrict(String district) {
        this.district = district;
    }

    public String getStoreName() {
        return storeName;
    }

    public void setStoreName(String storeName) {
        this.storeName = storeName;
    }

    public Map<String, Double> getTenders() {
        return tenders;
    }

    public void setTenders(Map<String, Double> tenders) {
        this.tenders = tenders;
    }

    public Map<String, Double> getExpenses() {
        return expenses;
    }

    public void setExpenses(Map<String, Double> expenses) {
        this.expenses = expenses;
    }

    public Map<String, Double> getSales() {
        return sales;
    }

    public void setSales(Map<String, Double> sales) {
        this.sales = sales;
    }

    public void addTender(String name, Double amount) {
        this.tenders.put(name, amount);
    }

    public void addExpense(String name, Double amount) {
        this.expenses.put(name, amount);
    }

    public void addSale(String name, Double amount) {
        this.sales.put(name, amount);
    }
}
