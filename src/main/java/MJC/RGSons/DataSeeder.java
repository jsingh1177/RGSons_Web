package MJC.RGSons;

import MJC.RGSons.model.Item;
import MJC.RGSons.model.Ledger;
import MJC.RGSons.model.Party;
import MJC.RGSons.model.Store;
import MJC.RGSons.model.UserStoreMap;
import MJC.RGSons.model.Users;
import MJC.RGSons.repository.ItemRepository;
import MJC.RGSons.repository.LedgerRepository;
import MJC.RGSons.repository.PartyRepository;
import MJC.RGSons.repository.UserStoreMapRepository;
import MJC.RGSons.service.StoreService;
import MJC.RGSons.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import java.util.Optional;

@Component
public class DataSeeder implements CommandLineRunner {

    @Autowired
    private UserService userService;

    @Autowired
    private StoreService storeService;
    
    @Autowired
    private UserStoreMapRepository userStoreMapRepository;

    @Autowired
    private PartyRepository partyRepository;

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private LedgerRepository ledgerRepository;

    @Override
    public void run(String... args) throws Exception {
        System.out.println("Starting Data Seeding...");

        // Create Test User
        String userName = "testuser";
        Optional<Users> existingUser = userService.getUserByUserName(userName);
        if (existingUser.isEmpty()) {
            Users user = new Users(userName, "password123", "USER", true);
            userService.createUser(user);
            System.out.println("Test user created: " + userName);
        } else {
            Users user = existingUser.get();
            user.setPassword("password123");
            userService.createUser(user);
            System.out.println("Test user password updated: " + userName);
        }

        // Create Test Admin
        String adminName = "admin";
        Optional<Users> existingAdmin = userService.getUserByUserName(adminName);
        if (existingAdmin.isEmpty()) {
            Users admin = new Users(adminName, "admin123", "ADMIN", true);
            userService.createUser(admin);
            System.out.println("Test admin created: " + adminName);
        } else {
            Users admin = existingAdmin.get();
            admin.setPassword("admin123");
            userService.createUser(admin);
            System.out.println("Test admin password updated: " + adminName);
        }

        // Create Test Store
        String storeCode = "STORE001";
        if (!storeService.storeCodeExists(storeCode)) {
            Store store = new Store(storeCode, "Test Store 1");
            store.setAddress("123 Test Street");
            store.setCity("Test City");
            store.setZone("North");
            storeService.createStore(store);
            System.out.println("Test store created: " + storeCode);
        } else {
            System.out.println("Test store already exists: " + storeCode);
        }
        
        // Map User to Store
        try {
            if (userStoreMapRepository.findByUserName(userName).isEmpty()) {
                UserStoreMap map = new UserStoreMap(userName, storeCode);
                userStoreMapRepository.save(map);
                System.out.println("Mapped user " + userName + " to store " + storeCode);
            }
        } catch (Exception e) {
            System.out.println("Error mapping user to store: " + e.getMessage());
        }

        // Seed Parties
        if (partyRepository.count() == 0) {
            Party p1 = new Party();
            p1.setName("Alpha Traders");
            p1.setCode("P001");
            p1.setAddress("123 Market St");
            p1.setPhone("9876543210");
            p1.setStatus(true);
            partyRepository.save(p1);

            Party p2 = new Party();
            p2.setName("Beta Enterprises");
            p2.setCode("P002");
            p2.setAddress("456 Ind Area");
            p2.setPhone("8765432109");
            p2.setStatus(true);
            partyRepository.save(p2);

            Party p3 = new Party();
            p3.setName("Gamma Retail");
            p3.setCode("P003");
            p3.setAddress("789 Mall Rd");
            p3.setPhone("7654321098");
            p3.setStatus(true);
            partyRepository.save(p3);
            
            System.out.println("Seeded 3 parties");
        }

        // Seed Items
        if (itemRepository.count() == 0) {
            itemRepository.save(new Item("ITEM001", "Cotton Shirt", 999.0));
            itemRepository.save(new Item("ITEM002", "Denim Jeans", 1499.0));
            itemRepository.save(new Item("ITEM003", "Sneakers", 2499.0));
            itemRepository.save(new Item("ITEM004", "T-Shirt", 499.0));
            System.out.println("Seeded 4 items");
        }

        // Ensure Item 1001 exists for testing
        try {
             if (itemRepository.findByItemCode("1001").isEmpty()) {
                 itemRepository.save(new Item("1001", "Test Item 1001", 500.0));
                 System.out.println("Seeded Test Item 1001");
             }
        } catch (Exception e) {
             System.out.println("Error seeding Item 1001: " + e.getMessage());
             e.printStackTrace();
        }

        // Ensure Item 10001 exists for testing (User Request)
        try {
             Optional<Item> item10001 = itemRepository.findByItemCode("10001");
             if (item10001.isEmpty()) {
                 itemRepository.save(new Item("10001", "Test Item 10001", 1200.0));
                 System.out.println("Seeded Test Item 10001");
             } else {
                 // Update existing item 10001 to ensure it has a price (in case of schema change)
                 Item item = item10001.get();
                 if (item.getMrp() == null) {
                     item.setMrp(1200.0);
                     itemRepository.save(item);
                     System.out.println("Updated Test Item 10001 with price");
                 }
             }
        } catch (Exception e) {
             System.out.println("Error seeding Item 10001: " + e.getMessage());
             e.printStackTrace();
        }

        // Seed Ledgers
        if (ledgerRepository.count() == 0) {
            ledgerRepository.save(new Ledger("1001", "Canteen", "Sale", "Sale", 1));
            ledgerRepository.save(new Ledger("1002", "Conveyance", "Expense", "Sale", 1));
            ledgerRepository.save(new Ledger("1003", "Salesman Food", "Expense", "Sale", 1));
            ledgerRepository.save(new Ledger("1004", "Cash", "Tender", "Sale", 1));
            ledgerRepository.save(new Ledger("1005", "Card", "Tender", "Sale", 1));
            ledgerRepository.save(new Ledger("1006", "UPI", "Tender", "Sale", 1));
            System.out.println("Seeded Ledgers");
        }

        System.out.println("Data Seeding Completed.");
    }
}

