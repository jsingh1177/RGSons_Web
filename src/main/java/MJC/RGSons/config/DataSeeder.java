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
import MJC.RGSons.repository.StoreRepository;
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
    private StoreRepository storeRepository;
    
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
            store.setBusinessDate("04-01-2026");
            
            // We need to bypass createStore's check if we want to force ID, or ensure createStore respects it.
            // StoreService.createStore checks if code exists, which we already did.
            // But it also auto-generates if null. Here it is not null.
            Store createdStore = storeService.createStore(store);
            storeCode = createdStore.getStoreCode();
            System.out.println("Test store created: " + storeCode);
        } else {
            System.out.println("Test store already exists: " + storeCode);
            Optional<Store> existingStore = storeService.getStoreByCode(storeCode);
            if (existingStore.isPresent()) {
                 Store s = existingStore.get();
                 s.setBusinessDate("04-01-2026");
                 storeRepository.save(s);
                 System.out.println("Updated business date for store: " + storeCode);
            }
        }
        
        // Map User to Store
        try {
            java.util.List<UserStoreMap> existingMaps = userStoreMapRepository.findByUserName(userName);
            if (existingMaps.isEmpty()) {
                UserStoreMap map = new UserStoreMap(userName, storeCode);
                userStoreMapRepository.save(map);
                System.out.println("Mapped user " + userName + " to store " + storeCode);
            } else {
                UserStoreMap map = existingMaps.get(0);
                if (!map.getStoreCode().equals(storeCode)) {
                    map.setStoreCode(storeCode);
                    userStoreMapRepository.save(map);
                    System.out.println("Updated mapping for user " + userName + " to store " + storeCode);
                }
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
        
        // Create HO Store
        String hoStoreCode = "HO001";
        if (!storeService.storeCodeExists(hoStoreCode)) {
             Store hoStore = new Store();
             hoStore.setStoreCode(hoStoreCode);
             hoStore.setStoreName("Head Office");
             hoStore.setStoreType("HO");
             hoStore.setAddress("HO Address");
             hoStore.setCity("HO City");
             hoStore.setZone("HO Zone");
             hoStore.setBusinessDate("04-01-2026");
             hoStore.setStatus(true);
             storeRepository.save(hoStore);
             System.out.println("HO Store created: " + hoStoreCode);
        } else {
             Optional<Store> hoStoreOpt = storeRepository.findByStoreCode(hoStoreCode);
             if (hoStoreOpt.isPresent()) {
                 Store hoStore = hoStoreOpt.get();
                 if (hoStore.getStoreType() == null || !hoStore.getStoreType().equals("HO")) {
                     hoStore.setStoreType("HO");
                     storeRepository.save(hoStore);
                     System.out.println("Updated HO Store type for: " + hoStoreCode);
                 }
             }
        }

        // Create HO User
        String hoUserName = "houser";
        Optional<Users> existingHoUser = userService.getUserByUserName(hoUserName);
        if (existingHoUser.isEmpty()) {
            Users hoUser = new Users(hoUserName, "houser123", "HO_USER", true);
            userService.createUser(hoUser);
            System.out.println("HO user created: " + hoUserName);
        } else {
             Users hoUser = existingHoUser.get();
             // Update password if it's the old short one or just enforce the new one
             hoUser.setPassword("houser123");
             userService.createUser(hoUser);
             System.out.println("HO user password updated: " + hoUserName);
        }

        // Map HO User to HO Store
        if (!userStoreMapRepository.existsByUserNameAndStoreCode(hoUserName, hoStoreCode)) {
            UserStoreMap map = new UserStoreMap();
            map.setUserName(hoUserName);
            map.setStoreCode(hoStoreCode);
            userStoreMapRepository.save(map);
            System.out.println("Mapped HO user to HO Store");
        }

        System.out.println("Data Seeding Completed.");
    }
}
