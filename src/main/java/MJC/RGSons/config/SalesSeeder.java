package MJC.RGSons.config;

import MJC.RGSons.model.Item;
import MJC.RGSons.model.Store;
import MJC.RGSons.model.TranHead;
import MJC.RGSons.model.TranItem;
import MJC.RGSons.repository.ItemRepository;
import MJC.RGSons.repository.StoreRepository;
import MJC.RGSons.repository.TranHeadRepository;
import MJC.RGSons.repository.TranItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Component
@Order(2) // Run after MasterDataSeeder
public class SalesSeeder implements CommandLineRunner {

    @Autowired
    private TranHeadRepository tranHeadRepository;
    
    @Autowired
    private TranItemRepository tranItemRepository;

    @Autowired
    private StoreRepository storeRepository;
    
    @Autowired
    private ItemRepository itemRepository;

    @Override
    public void run(String... args) throws Exception {
        if (tranHeadRepository.count() > 0 && tranItemRepository.count() > 0) {
            System.out.println("Sales data already exists. Skipping seeding.");
            return;
        }
        
        if (tranItemRepository.count() == 0 && tranHeadRepository.count() > 0) {
            System.out.println("Partial sales data detected (no items). Clearing existing sales to re-seed.");
            tranHeadRepository.deleteAll();
        }

        System.out.println("Seeding Sales Data...");
        List<Store> stores = storeRepository.findAll();
        List<Item> items = itemRepository.findAll();
        
        if (items.isEmpty()) {
            System.out.println("No items found. Cannot seed sales details.");
            return;
        }

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd-MM-yyyy");
        LocalDate today = LocalDate.now();
        Random random = new Random();

        for (Store store : stores) {
            if ("HO".equals(store.getStoreType())) continue;

            for (int i = 0; i < 7; i++) {
                LocalDate date = today.minusDays(i);
                String dateStr = date.format(formatter);
                
                int numTrans = random.nextInt(3) + 1;
                for (int j = 0; j < numTrans; j++) {
                    String invoiceNo = "INV-" + store.getStoreCode() + "-" + dateStr.replace("-", "") + "-" + j;
                    
                    // Create items first to calculate total
                    List<TranItem> tranItems = new ArrayList<>();
                    double totalAmount = 0;
                    int numItems = random.nextInt(3) + 1;
                    
                    for (int k = 0; k < numItems; k++) {
                        Item item = items.get(random.nextInt(items.size()));
                        TranItem tranItem = new TranItem();
                        tranItem.setInvoiceNo(invoiceNo);
                        tranItem.setInvoiceDate(dateStr);
                        tranItem.setStoreCode(store.getStoreCode());
                        tranItem.setItemCode(item.getItemCode());
                        tranItem.setQuantity(random.nextInt(5) + 1);
                        tranItem.setMrp(item.getMrp());
                        double itemAmount = tranItem.getQuantity() * tranItem.getMrp();
                        tranItem.setAmount(itemAmount);
                        
                        tranItems.add(tranItem);
                        totalAmount += itemAmount;
                    }
                    
                    tranItemRepository.saveAll(tranItems);

                    TranHead tran = new TranHead();
                    tran.setStoreCode(store.getStoreCode());
                    tran.setInvoiceDate(dateStr);
                    tran.setInvoiceNo(invoiceNo);
                    tran.setPartyCode("CASH");
                    tran.setTotalAmount(totalAmount);
                    tran.setSaleAmount(totalAmount);
                    tran.setTenderType("Cash");
                    
                    tranHeadRepository.save(tran);
                }
            }
            System.out.println("Seeded sales for store: " + store.getStoreCode());
        }
        System.out.println("Sales Seeding Completed.");
    }
}
