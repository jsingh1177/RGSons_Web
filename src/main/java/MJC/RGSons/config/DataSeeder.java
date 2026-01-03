package MJC.RGSons.config;

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
import MJC.RGSons.service.SequenceGeneratorService;
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
    private SequenceGeneratorService sequenceGeneratorService;

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
        String storeCode = "10000";
        if (!storeService.storeCodeExists(storeCode)) {
            // Pass null for storeCode to trigger auto-generation (which starts at 10000)
            Store store = new Store(null, "Test Store 1");
            store.setAddress("123 Test Street");
            store.setCity("Test City");
            store.setZone("North");
            
            Store createdStore = storeService.createStore(store);
            System.out.println("Test store created: " + createdStore.getStoreCode());
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
            p1.setType("Vendor");
            partyRepository.save(p1);
            
            Party p2 = new Party();
            p2.setName("Beta Retail");
            p2.setType("Customer");
            partyRepository.save(p2);
            System.out.println("Seeded parties");
        }
        
        System.out.println("Data Seeding Completed.");
    }
}
