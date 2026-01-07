package MJC.RGSons.service;

import MJC.RGSons.model.StateMaster;
import MJC.RGSons.repository.StateMasterRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
public class StateMasterSeeder implements CommandLineRunner {

    @Autowired
    private StateMasterRepository repository;

    @Override
    public void run(String... args) {
        List<StateMaster> states = Arrays.asList(
                new StateMaster("01", "Jammu & Kashmir"),
                new StateMaster("02", "Himachal Pradesh"),
                new StateMaster("03", "Punjab"),
                new StateMaster("04", "Chandigarh"),
                new StateMaster("05", "Uttarakhand"),
                new StateMaster("06", "Haryana"),
                new StateMaster("07", "Delhi"),
                new StateMaster("08", "Rajasthan"),
                new StateMaster("09", "Uttar Pradesh"),
                new StateMaster("10", "Bihar"),
                new StateMaster("11", "Sikkim"),
                new StateMaster("12", "Arunachal Pradesh"),
                new StateMaster("13", "Nagaland"),
                new StateMaster("14", "Manipur"),
                new StateMaster("15", "Mizoram"),
                new StateMaster("16", "Tripura"),
                new StateMaster("17", "Meghalaya"),
                new StateMaster("18", "Assam"),
                new StateMaster("19", "West Bengal"),
                new StateMaster("20", "Jharkhand"),
                new StateMaster("21", "Odisha"),
                new StateMaster("22", "Chhattisgarh"),
                new StateMaster("23", "Madhya Pradesh"),
                new StateMaster("24", "Gujarat"),
                new StateMaster("25", "Daman & Diu"),
                new StateMaster("26", "Dadra & Nagar Haveli"),
                new StateMaster("27", "Maharashtra"),
                new StateMaster("28", "Andhra Pradesh"),
                new StateMaster("29", "Karnataka"),
                new StateMaster("30", "Goa"),
                new StateMaster("31", "Lakshadweep"),
                new StateMaster("32", "Kerala"),
                new StateMaster("33", "Tamil Nadu"),
                new StateMaster("34", "Puducherry"),
                new StateMaster("35", "Andaman & Nicobar Islands"),
                new StateMaster("36", "Telangana"),
                new StateMaster("37", "Andhra Pradesh"),
                new StateMaster("38", "Ladakh"),
                new StateMaster("97", "Other Territory"),
                new StateMaster("99", "Centre Jurisdiction")
        );

        for (StateMaster state : states) {
            if (!repository.existsByCode(state.getCode())) {
                repository.save(state);
            }
        }
    }
}
