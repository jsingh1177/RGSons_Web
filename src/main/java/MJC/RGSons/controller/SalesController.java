package MJC.RGSons.controller;

import MJC.RGSons.dto.SalesTransactionDTO;
import MJC.RGSons.model.Item;
import MJC.RGSons.model.Party;
import MJC.RGSons.model.TranItem;
import MJC.RGSons.model.TranLedger;
import MJC.RGSons.service.SalesService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Optional;

@RestController
@RequestMapping("/api/sales")
@CrossOrigin(origins = "*")
public class SalesController {

    @Autowired
    private SalesService salesService;

    @GetMapping("/parties")
    public List<Party> getAllParties() {
        return salesService.getPartiesByType("Vendor");
    }

    @GetMapping("/items")
    public List<Item> getAllItems() {
        return salesService.getAllItems();
    }

    @GetMapping("/items/{code}")
    public ResponseEntity<Item> getItemByCode(@PathVariable String code) {
        Optional<Item> item = salesService.getItemByCode(code);
        return item.map(ResponseEntity::ok)
                   .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/items/by-date")
    public ResponseEntity<List<TranItem>> getSalesItemsByDate(@RequestParam String date) {
        List<TranItem> items = salesService.getTranItemsByDate(date);
        return ResponseEntity.ok(items);
    }

    @GetMapping("/items/by-store-date")
    public ResponseEntity<List<TranItem>> getSalesItemsByStoreAndDate(
            @RequestParam String store,
            @RequestParam String date) {
        List<TranItem> items = salesService.getTranItemsByStoreAndDate(date, store);
        return ResponseEntity.ok(items);
    }

    @GetMapping("/ledgers/by-store-date")
    public ResponseEntity<List<TranLedger>> getSalesLedgersByStoreAndDate(
            @RequestParam String store,
            @RequestParam String date) {
        List<TranLedger> ledgers = salesService.getTranLedgersByStoreAndDate(date, store);
        return ResponseEntity.ok(ledgers);
    }

    @PostMapping("/save")
    public ResponseEntity<String> saveTransaction(@RequestBody SalesTransactionDTO dto) {
        try {
            salesService.saveTransaction(dto);
            return ResponseEntity.ok("Invoice saved successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error saving invoice: " + e.getMessage());
        }
    }
    
    @GetMapping("/generate-invoice-no")
    public ResponseEntity<String> generateInvoiceNo() {
        return ResponseEntity.ok(salesService.generateInvoiceNumber());
    }

    @GetMapping("/SalesData")
    public ResponseEntity<Map<String, Object>> getSalesData() {
        Map<String, Object> response = new HashMap<>();
        List<SalesTransactionDTO> transactions = salesService.getSalesData();
        
        List<Map<String, Object>> formattedTransactions = transactions.stream().map(dto -> {
            Map<String, Object> map = new HashMap<>();
            map.put("invoiceNo", dto.getInvoiceNo());
            map.put("invoiceDate", dto.getInvoiceDate());
            map.put("partyCode", dto.getPartyCode());
            map.put("partyName", dto.getPartyName());
            map.put("saleAmount", dto.getSaleAmount());
            map.put("tenderType", dto.getTenderType());
            map.put("storeCode", dto.getStoreCode());
            map.put("userId", dto.getUserId());
            map.put("otherSale", dto.getOtherSale());
            map.put("totalExpenses", dto.getTotalExpenses());
            map.put("totalTender", dto.getTotalTender());
            map.put("otherSaleDetails", dto.getOtherSaleDetails());
            map.put("expenseDetails", dto.getExpenseDetails());
            map.put("tenderDetails", dto.getTenderDetails());
            map.put("items", dto.getItems());
            return map;
        }).collect(java.util.stream.Collectors.toList());

        response.put("Invoices", formattedTransactions);
        return ResponseEntity.ok(response);
    }
}
