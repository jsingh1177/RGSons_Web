package MJC.RGSons.service;

import MJC.RGSons.dto.CategorySalesDTO;
import MJC.RGSons.dto.StoreSalesDTO;
import MJC.RGSons.model.Category;
import MJC.RGSons.model.Item;
import MJC.RGSons.model.Store;
import MJC.RGSons.model.TranHead;
import MJC.RGSons.model.TranItem;
import MJC.RGSons.repository.CategoryRepository;
import MJC.RGSons.repository.ItemRepository;
import MJC.RGSons.repository.StoreRepository;
import MJC.RGSons.repository.TranHeadRepository;
import MJC.RGSons.repository.TranItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class ReportService {

    @Autowired
    private TranHeadRepository tranHeadRepository;

    @Autowired
    private TranItemRepository tranItemRepository;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    public List<StoreSalesDTO> getStoreWiseSales(LocalDate startDate, LocalDate endDate) {
        List<String> dateRange = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd-MM-yyyy");

        LocalDate current = startDate;
        while (!current.isAfter(endDate)) {
            dateRange.add(current.format(formatter));
            current = current.plusDays(1);
        }

        List<TranHead> transactions = tranHeadRepository.findByInvoiceDateIn(dateRange);

        Map<String, Double> salesByStore = transactions.stream()
                .collect(Collectors.groupingBy(
                        TranHead::getStoreCode,
                        Collectors.summingDouble(t -> t.getTotalAmount() != null ? t.getTotalAmount() : 0.0)
                ));

        List<StoreSalesDTO> report = new ArrayList<>();
        for (Map.Entry<String, Double> entry : salesByStore.entrySet()) {
            String storeCode = entry.getKey();
            Double totalSales = entry.getValue();
            String storeName = "Unknown Store";

            Optional<Store> storeOpt = storeRepository.findByStoreCode(storeCode);
            if (storeOpt.isPresent()) {
                storeName = storeOpt.get().getStoreName();
            }

            report.add(new StoreSalesDTO(storeCode, storeName, totalSales));
        }

        return report;
    }

    public List<CategorySalesDTO> getCategoryWiseSales(LocalDate startDate, LocalDate endDate) {
        List<String> dateRange = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd-MM-yyyy");

        LocalDate current = startDate;
        while (!current.isAfter(endDate)) {
            dateRange.add(current.format(formatter));
            current = current.plusDays(1);
        }

        // 1. Get Transactions for the date range
        List<TranHead> transactions = tranHeadRepository.findByInvoiceDateIn(dateRange);
        List<String> invoiceNos = transactions.stream()
                .map(TranHead::getInvoiceNo)
                .collect(Collectors.toList());

        if (invoiceNos.isEmpty()) {
            return new ArrayList<>();
        }

        // 2. Get Transaction Items
        List<TranItem> tranItems = tranItemRepository.findByInvoiceNoIn(invoiceNos);

        // 3. Prepare caches for Item -> Category Code and Category Code -> Category Name
        Map<String, String> itemToCategoryMap = itemRepository.findAll().stream()
                .collect(Collectors.toMap(Item::getItemCode, Item::getCategoryCode, (v1, v2) -> v1));
        
        Map<String, String> categoryToNameMap = categoryRepository.findAll().stream()
                .collect(Collectors.toMap(Category::getCode, Category::getName, (v1, v2) -> v1));

        // 4. Aggregate Sales by Category
        Map<String, Double> salesByCategory = new HashMap<>();

        for (TranItem item : tranItems) {
            String itemCode = item.getItemCode();
            String categoryCode = itemToCategoryMap.getOrDefault(itemCode, "UNKNOWN");
            String categoryName = categoryToNameMap.getOrDefault(categoryCode, "Unknown Category");
            
            salesByCategory.put(categoryName, salesByCategory.getOrDefault(categoryName, 0.0) + item.getAmount());
        }

        // 5. Convert to DTO
        List<CategorySalesDTO> report = new ArrayList<>();
        for (Map.Entry<String, Double> entry : salesByCategory.entrySet()) {
            report.add(new CategorySalesDTO(null, entry.getKey(), entry.getValue()));
        }

        return report;
    }
}
