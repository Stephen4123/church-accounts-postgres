import fs from 'fs';
import path from 'path';
import { query, isPostgres, memoryStore, saveLocalStore } from './index';

interface RawMember {
  code: string;
  name: string;
  address: string;
  phone: string;
}

const rawData: RawMember[] = [
  { code: "H01", name: "Br. A.C Thomas", address: "Aruvikuzhiyil House, Thadiyoor", phone: "" },
  { code: "H02", name: "Br. Abraham Mathew", address: "Kallirikkumparambil House, Thadiyoor", phone: "+91 9495383338" },
  { code: "H03", name: "Br. Abraham Varughese", address: "Ayveliyil House, Charalkunnu", phone: "+91 8606810339" },
  { code: "H04", name: "Br. Abraham Varughese", address: "Vazhayalil House, Kanjeettukara", phone: "+91 9495921136" },
  { code: "H05", name: "Br. Ajo Raju", address: "Lahethu Kochuzham House, Thadiyoor", phone: "" },
  { code: "H06", name: "Br. Alex C John", address: "Cherapurathu House, Thelliyoor", phone: "+91 9446906912" },
  { code: "H07", name: "Sr. Aleyamma John", address: "Kottakkattethu House, Thadiyoor", phone: "" },
  { code: "H08", name: "Sr. Aleyamma Thomas", address: "Thekkattil House, Thadiyoor", phone: "" },
  { code: "H09", name: "Sr. Ammini Joseph (Babu)", address: "Paruthikalayail House, Thadiyoor", phone: "" },
  { code: "H10", name: "Sr. Annamma", address: "Panakalthadathil House", phone: "" },
  { code: "H11", name: "Sr. Annamma George", address: "Thadathil House, Thadiyoor", phone: "" },
  { code: "H12", name: "Sr. Annamma Thomas", address: "Elampuredathil House, Nellekkmon", phone: "" },
  { code: "H13", name: "Sr. Anu Raju", address: "Lahethu Kochuzham House, Thadiyoor", phone: "" },
  { code: "H14", name: "Br. Biby Thomas", address: "Vettirethu Maruthikal House, Thadiyoor", phone: "+91 9539777743" },
  { code: "H15", name: "Br. Bijoy Philp", address: "Kavumthundiyil House, Kolabhagom", phone: "" },
  { code: "H16", name: "Br. Biju P", address: "Panakalthadathil", phone: "" },
  { code: "H17", name: "Pr. Biju Varughese", address: "Kizhakkeppallil House, Thadiyoor", phone: "+61 469332840" },
  { code: "H18", name: "Br. Bincy V Varughese", address: "Vadakkethundiyil House, Thadiyoor", phone: "+91 9745344115" },
  { code: "H19", name: "Br. Binoy Philp", address: "Kavumthundiyil House, Kolabhagom", phone: "" },
  { code: "H20", name: "Br. Binson V Thomas", address: "Vettirethu Maruthikal House, Thadiyoor", phone: "" },
  { code: "H21", name: "Br. Binu K Thomas", address: "Kavumthundiyil House, Kuriannoor", phone: "" },
  { code: "H22", name: "Br. Binu Varughese", address: "Kizhakkeppallil House, Thadiyoor", phone: "" },
  { code: "H23", name: "Br. Blessen C.J", address: "Puthanparambil", phone: "" },
  { code: "H24", name: "Br. C.A Abraham (Br Achankunju)", address: "Chakkuthara House, Thadiyoor", phone: "+91 9495184720" },
  { code: "H25", name: "Br. C.A Varughese", address: "Chakkuthara House, Thadiyoor", phone: "+91 9495184720" },
  { code: "H26", name: "Br. C.J Mathew", address: "Cherapurathu House, Thelliyoor", phone: "+91 9846911571" },
  { code: "H27", name: "Br. C.J Thomas", address: "Cherapurathu House, Thelliyoor", phone: "+91 9847114023" },
  { code: "H28", name: "Br. C.M John", address: "Cherapurathu House, Thadiyoor", phone: "" },
  { code: "H29", name: "Br. C.M Samuel", address: "Cheruvila Puthenveedu, Thadiyoor", phone: "" },
  { code: "H30", name: "Br. C.V Abraham", address: "Chakkuthara House, Thadiyoor", phone: "" },
  { code: "H31", name: "Br. Chacko Mathai", address: "Thadathil House, Thadiyoor", phone: "" },
  { code: "H32", name: "Br. Clement Vitor", address: "Kollakottu House, Thadiyoor", phone: "" },
  { code: "H33", name: "Br. David K Thomas", address: "", phone: "" },
  { code: "H34", name: "Br. Davis George Thomas", address: "Cherapurathu House, Kuravankunzhy", phone: "+91 8606296623" },
  { code: "H35", name: "Br. Dipin T Mathew", address: "Kriampanamkuzhil Thadathil House, Kolabhagom", phone: "" },
  { code: "H36", name: "Br. Eapen Abraham (Achankunj)", address: "Lahethu House, Thadiyoor", phone: "" },
  { code: "H37", name: "Evening Food Expenses for Church Members", address: "Thadiyoor", phone: "" },
  { code: "H38", name: "Br. George Rajan", address: "Kariyalil House, Thadiyoor", phone: "+91 9747835646" },
  { code: "H39", name: "Br. George Thomas (Sam)", address: "Kulanjiyil House, Thadiyoor", phone: "+91 8943608966" },
  { code: "H40", name: "Br. Gibin Ninan", address: "Mudyyilathu Gibin Villa, Pullad", phone: "" },
  { code: "H41", name: "Br. I.T Daneil", address: "Ivelikuzhyil House, Thadiyoor", phone: "" },
  { code: "H42", name: "Evg. IK Mathew", address: "Iykkara Malayil House, Thadiyoor", phone: "+91 9495266162" },
  { code: "H43", name: "Inter-Bank Transfer", address: "Thadiyoor", phone: "" },
  { code: "H44", name: "Br. Jacob Mathew", address: "Poovanpara House, Thadiyoor", phone: "" },
  { code: "H45", name: "Br. James Mathew", address: "Cherapurathu House, Thadiyoor", phone: "" },
  { code: "H46", name: "Br. Jibil C Mathew", address: "Chellethu House, Plankamon", phone: "" },
  { code: "H47", name: "Br. Jibin C Varughese", address: "Chakkuthara House, Thadiyoor", phone: "" },
  { code: "H48", name: "Br. Jibin George John", address: "Kezholickal Mepruth House, Thadiyoor", phone: "" },
  { code: "H49", name: "Br. Jijo K Philip", address: "Kadayatt Maruthuvelil (Kalloth) House, Thadiyoor", phone: "" },
  { code: "H50", name: "Sr. Jincy V Varughese", address: "Vadakkethundiyil House, Thadiyoor", phone: "" },
  { code: "H51", name: "Br. Jinu Mathew", address: "Chakkittayail House, Kolabhagom", phone: "" },
  { code: "H52", name: "Br. Jobin C Varughese", address: "Chakkuthara House, Thadiyoor", phone: "" },
  { code: "H53", name: "Br. Jobin Mathew John", address: "Kezholickal Mepruth House, Thadiyoor", phone: "" },
  { code: "H54", name: "Br. John K.M", address: "Mepurathu House", phone: "" },
  { code: "H55", name: "Br. John Kurian", address: "Maliakkaparambil House, Thadiyoor", phone: "" },
  { code: "H56", name: "Br. John Mathai", address: "Kezholickal Mepruth House, Thadiyoor", phone: "" },
  { code: "H57", name: "Br. John Mathew", address: "Kottakkattethu House, Thadiyoor", phone: "+91 8281303041" },
  { code: "H58", name: "Br. John Mathew", address: "Cherapurathu House, Thelliyoor", phone: "" },
  { code: "H59", name: "Br. John Thomas", address: "Puthenveedu House, Kolabhagom", phone: "" },
  { code: "H60", name: "Br. John Varughese", address: "Cherapurathu House, Thelliyoor", phone: "" },
  { code: "H61", name: "Br. Johnson Mathew", address: "Vahamoottil Thadathil House, Thadiyoor", phone: "" },
  { code: "H62", name: "Br. Jose Thomas", address: "Thekkattil House, Thadiyoor", phone: "" },
  { code: "H63", name: "Br. Joseph George", address: "Kariyalil House, Thadiyoor", phone: "" },
  { code: "H64", name: "Pr. K G Rajan", address: "Kariyalil House, Thadiyoor", phone: "+91 8606282433" },
  { code: "H65", name: "Br. K V Kurian", address: "Kannanthanatthu House, Thelliyoor", phone: "" },
  { code: "H66", name: "Br. K.C John", address: "Kollakottu House, Thadiyoor", phone: "" },
  { code: "H67", name: "Br. K.G Joy", address: "Kariyalil House, Thadiyoor", phone: "" },
  { code: "H68", name: "Br. K.K Mathew", address: "Kavumkal House, Thadiyoor", phone: "" },
  { code: "H69", name: "Br. K.M Mathew", address: "Kalloth House, Thadiyoor", phone: "+91 9496950057" },
  { code: "H70", name: "Br. K.M Philip", address: "Kavumthundiyil House, Kolabhagom", phone: "+91 9400206044" },
  { code: "H71", name: "Pr. K.M Philip (Babukutty, Delhi)", address: "Kariyalil House, Thadiyoor", phone: "" },
  { code: "H72", name: "Br. K.M Philp", address: "Kalloth House, Thelliyoor", phone: "" },
  { code: "H73", name: "Br. K.M Thomas", address: "Kunnokalil House, Thadiyoor", phone: "+91 9048119204" },
  { code: "H74", name: "Br. K.M Varughese", address: "Krukapparambil House, Thadiyoor", phone: "" },
  { code: "H75", name: "Br. K.P Abraham", address: "Karakkattu Punnamuttil House, Thadiyoor", phone: "" },
  { code: "H76", name: "Br. K.P Abraham", address: "Kariyalil House, Thadiyoor", phone: "" },
  { code: "H77", name: "Br. K.P Chacko", address: "Kalloth House, Thadiyoor", phone: "" },
  { code: "H78", name: "Br. K.P Chacko", address: "Kariyalil House, Thadiyoor", phone: "" },
  { code: "H79", name: "Br. K.P George", address: "Kariyalil House, Thadiyoor", phone: "" },
  { code: "H80", name: "Br. K.P Philipose", address: "Kariyalil House, Thadiyoor", phone: "" },
  { code: "H81", name: "Br. K.P Thomas", address: "Kariyalil House, Thadiyoor", phone: "" },
  { code: "H82", name: "Br. K.T Mathew", address: "Kavumthundiyil House, Kolabhagom", phone: "" },
  { code: "H83", name: "Br. K.V Mathai", address: "Kallirikkumparambil House, Thadiyoor", phone: "" },
  { code: "H84", name: "Br. K.V Thomas", address: "Kainnon House, Thadiyoor", phone: "" },
  { code: "H85", name: "Br. K.V Thomas", address: "Kuzhimannil House, Thadiyoor", phone: "" },
  { code: "H86", name: "Br. K.V Varughese", address: "Kizhakkeppallil House, Thadiyoor", phone: "" },
  { code: "H87", name: "Br. Koshy Varughese", address: "Mannampallil House, Thadiyoor", phone: "" },
  { code: "H88", name: "Br. Kurian K Mathew", address: "Kavumkal House, Thadiyoor", phone: "" },
  { code: "H89", name: "Br. Kurian Mathew", address: "Kalayil Puthenveettil House, Thadiyoor", phone: "" },
  { code: "H90", name: "Br. Lalu Thomas", address: "Vazhayalil House, Thelliyoor", phone: "+91 9961946760" },
  { code: "H91", name: "Sr. Lillykutty Abraham", address: "Vazhayalil House, Thelliyoor", phone: "" },
  { code: "H92", name: "Sr. Lissy Thomas", address: "Chakkuthara House, Thadiyoor", phone: "" },
  { code: "H93", name: "Sr. M Sabhi Anesan", address: "Vadakkeparambil House, Thadiyoor", phone: "" },
  { code: "H94", name: "Sr. Mariamma Thomas", address: "Ittimuruthel House, Theodical", phone: "" },
  { code: "H95", name: "Sr. Mariyamma Thomas", address: "Kuzhimannil Paruthimukku", phone: "+91 9847638009" },
  { code: "H96", name: "Sr. Marrykutty", address: "Manayathumail Bethshalom House, Kuravankunzhy", phone: "" },
  { code: "H97", name: "Br. Martin V Mathews", address: "Vellarethu House, Thadiyoor", phone: "" },
  { code: "H98", name: "Sr. Maryamma Joy", address: "Poovanpara House", phone: "" },
  { code: "H99", name: "Br. Mathai Thomas", address: "Poovanpara House, Thadiyoor", phone: "" },
  { code: "H100", name: "Br. Mathai Varughese", address: "Kuzhimannil House, Kolabhagom", phone: "+91 9847638009" },
  { code: "H101", name: "Br. Mathew Abraham", address: "Pentagon Peace Cottage, Thadiyoor", phone: "" },
  { code: "H102", name: "Br. Mathew C.C", address: "Sramadha Thundiyil, Kuravankunzhy", phone: "" },
  { code: "H103", name: "Br. Mathew P Abraham", address: "Poovanpara House, Thadiyoor", phone: "+91 9744505894" },
  { code: "H104", name: "Br. Mathew T.C", address: "Sramadathundiyil House, Pullad", phone: "+91 7907866536" },
  { code: "H105", name: "Br. Mathew Thomas", address: "Chellethu House, Plankamon", phone: "+91 6238267102" },
  { code: "H106", name: "Br. Mathew Varughese", address: "Kainnon House, Thadiyoor", phone: "" },
  { code: "H107", name: "Sr. Mini Sara Sabu", address: "Thanathodathil", phone: "" },
  { code: "H108", name: "Br. Mohan Samuel", address: "Mulakodymavumkal House, Thadiyoor", phone: "" },
  { code: "H109", name: "Br. Moncy Easo", address: "Thanathodathil House, Thadiyoor", phone: "" },
  { code: "H110", name: "Sr. Moncy Raju", address: "Maletnu House", phone: "+91 9526704031" },
  { code: "H111", name: "Pr. Moncy V Varughese", address: "Vadakkethundiyil House,Kolabhagom", phone: "+91 9446067609" },
  { code: "H112", name: "Br. Ninan Joseph", address: "Mudyyilathu Gibin Villa, Pullad", phone: "+91 7025634950" },
  { code: "H113", name: "Br. O.M Raju", address: "Lahethu Kochuzham House, Thadiyoor", phone: "+91 9791531728" },
  { code: "H114", name: "Offertory", address: "IPC Horeb Church,Thadiyoor", phone: "" },
  { code: "H115", name: "Br. Oomen Thomas", address: "Ivelikuzhyil House, Thadiyoor", phone: "" },
  { code: "H116", name: "Br. P.C Jacob", address: "Plamthottathil House, Pullad", phone: "+91 9446113289" },
  { code: "H117", name: "Br. P.G Rameshan", address: "Perumparra House, Kolabhagom", phone: "" },
  { code: "H118", name: "Br. P.J Thomas", address: "Poovanpara House, Thadiyoor", phone: "+91 8943921929" },
  { code: "H119", name: "Br. P.M Gopi", address: "Pakkavumkal House, Thadiyoor", phone: "" },
  { code: "H120", name: "Br. P.T Abraham", address: "Poovanpara House, Thadiyoor", phone: "" },
  { code: "H121", name: "Br. P.T Philphose", address: "Kariyalil House, Thadiyoor", phone: "" },
  { code: "H122", name: "Pr. Paulose K George", address: "Kumblasseryil House, Thadiyoor", phone: "" },
  { code: "H123", name: "Br. Philip K Chacko", address: "Kariyalil Ebenezar House, Thadiyoor", phone: "" },
  { code: "H124", name: "Br. Philipose (Baby)", address: "Kochuchanayil House, Thadiyoor", phone: "" },
  { code: "H125", name: "Br. Philipose Chacko (Jose K Chacko)", address: "Kadayatt Maruthuvelil (Kalloth) House, Thadiyoor", phone: "" },
  { code: "H126", name: "Br. Philipose K.C", address: "Kizhakkethil House, Thadiyoor", phone: "+91 9947063431" },
  { code: "H127", name: "Br. Philp Daniel", address: "Kallirikkumparambil House, Thadiyoor", phone: "" },
  { code: "H128", name: "Br. Philp K Joseph (Jijo)", address: "Kariyalil House, Thadiyoor", phone: "" },
  { code: "H129", name: "Sr. Princy James", address: "Konattuplackal House, Kolabhagom", phone: "+91 8547650305" },
  { code: "H130", name: "Br. Rajan K Philip", address: "Kariyalil House, Thadiyoor", phone: "+91 9961632051" },
  { code: "H131", name: "Br. Raju Abraham", address: "Malethu House, Thadiyoor", phone: "+91 9526704042" },
  { code: "H132", name: "Br. Raju Mathew", address: "Chellethu House, Thadiyoor", phone: "+91 9656241800" },
  { code: "H133", name: "Pr. Raju Mathew", address: "Puthenpurayil House, Kolabhagom", phone: "+91 9446186109" },
  { code: "H134", name: "Br. Ravindran P (Biju)", address: "Panackathadathil House, Thadiyoor", phone: "+91 9562666438" },
  { code: "H135", name: "Br. Rejoy Philp", address: "Kavumthundiyil House, Kolabhagom", phone: "" },
  { code: "H136", name: "Br. Renju V Ninan", address: "Kallirikkumparambil House, Thadiyoor", phone: "+91 9947612356" },
  { code: "H137", name: "Br. Renny Varughese Mathew", address: "Kallirikkumparambil House, Thadiyoor", phone: "" },
  { code: "H138", name: "Br. Renoy Philip", address: "Kavumthundayil", phone: "" },
  { code: "H139", name: "Br. Rijil Rajan", address: "Kariyalil House, Thadiyoor", phone: "" },
  { code: "H140", name: "Br. Ron Roy", address: "Kavumthundiyil House, Kolabhagom", phone: "" },
  { code: "H141", name: "Br. Roshan Raju", address: "Chellethu House, Thadiyoor", phone: "" },
  { code: "H142", name: "Br. Roy C Cherian", address: "Kollakottu House, Thadiyoor", phone: "" },
  { code: "H143", name: "Br. Roy Mathews", address: "Kavumthundiyil House, Kolabhagom", phone: "+91 9544498849" },
  { code: "H144", name: "Br. Sajan Varughese", address: "Kizhakkeppallil House, Thadiyoor", phone: "" },
  { code: "H145", name: "Br. Saji P Abraham", address: "Karakkattu Punnamuttil House, Thadiyoor", phone: "" },
  { code: "H146", name: "Br. Saji V Thomas", address: "Vazhayalil House, Kolabhagom", phone: "+91 9495922126" },
  { code: "H147", name: "Pr. Saju John", address: "Kottakkattethu House, Thadiyoor", phone: "" },
  { code: "H148", name: "Br. Sam K Abraham", address: "Kariyalil House, Thadiyoor", phone: "+91 9061307925" },
  { code: "H149", name: "Br. Sam Koshy", address: "Mannampallil House, Thadiyoor", phone: "" },
  { code: "H150", name: "Br. Sam Mathew", address: "Kavumthundiyil House, Kolabhagom", phone: "" },
  { code: "H151", name: "Br. Samuel", address: "Chekkattu House, Thadiyoor", phone: "" },
  { code: "H152", name: "Br. Samuel Philip", address: "Kariyalil House, Thadiyoor", phone: "" },
  { code: "H153", name: "Sr. Santhamma Mathew", address: "Poovanpara Bethel House", phone: "" },
  { code: "H154", name: "Br. Santhosh Daniel", address: "Ivelikuzhyil House, Thadiyoor", phone: "+91 9847256276" },
  { code: "H155", name: "Sr. Saramma", address: "Aruvikuzhiyil House, Thadiyoor", phone: "" },
  { code: "H156", name: "Br. Sherin Johnson", address: "Chekkattu House, Thadiyoor", phone: "" },
  { code: "H157", name: "Br. Shiju P Mathew", address: "Poovanpara House, Thadiyoor", phone: "" },
  { code: "H158", name: "Br. Shynu Thomas", address: "Kunnokalil House, Thadiyoor", phone: "" },
  { code: "H159", name: "Br. Sijo Mathew", address: "Thekkel Zion House, Kuriannoor", phone: "" },
  { code: "H160", name: "Sr. Sneha Maryam Jacob", address: "Plamthottathil", phone: "" },
  { code: "H161", name: "Br. Sonu Abraham", address: "Lahethu", phone: "" },
  { code: "H162", name: "Evg. Sunil K Thomas", address: "Manayathumail Bethshalom House, Kuravankunzhy", phone: "" },
  { code: "H163", name: "Br. Sunny Daniel", address: "Ivelikuzhyil House, Thadiyoor", phone: "" },
  { code: "H164", name: "Br. Sunny Philip", address: "Kariyalil House, Thadiyoor", phone: "+91 9947064484" },
  { code: "H165", name: "Sr. Sussama Chandy", address: "Puthuparambil House, Thadiyoor", phone: "" },
  { code: "H166", name: "Br. T.I Varughese", address: "Thengumtharayil House, Thadiyoor", phone: "" },
  { code: "H167", name: "Br. T.J Varughese", address: "Chellethu House", phone: "" },
  { code: "H168", name: "Pr. T.T Abraham", address: "Maruthuvelil Thadathil House, Thadiyoor", phone: "" },
  { code: "H169", name: "Pr. T.T.Simon", address: "IPC Horeb Parsonage", phone: "+91 9074555494" },
  { code: "H170", name: "Sr. Thankamma Mathew", address: "Kariyalil House, Thadiyoor", phone: "" },
  { code: "H171", name: "Pr. Thomas Abraham", address: "Poovanpara House, Thadiyoor", phone: "+91 6282343390" },
  { code: "H172", name: "Br. Thomas Joseph", address: "Ayveliyil House, Thadiyoor", phone: "" },
  { code: "H173", name: "Br. Thomas Joseph", address: "Kariyalil House, Thadiyoor", phone: "+91 9446186034" },
  { code: "H174", name: "Br. Thomas K Joseph (Ajo)", address: "Kariyalil House, Thadiyoor", phone: "" },
  { code: "H175", name: "Br. Thomas Mathai", address: "Kadamplacal House, Thadiyoor", phone: "" },
  { code: "H176", name: "Br. Thomas Mathew", address: "Poovanpara House", phone: "" },
  { code: "H177", name: "Br. Thomas Mathew", address: "Poovanpara House, Thadiyoor", phone: "" },
  { code: "H178", name: "Br. Thomas Mathew", address: "Kavumthundiyil House, Kolabhagom", phone: "" },
  { code: "H179", name: "Br. Thomas Mathews", address: "Thekkel Zion House, Kuriannoor", phone: "+91 9443672637" },
  { code: "H180", name: "Br. Thomas Philp (Moncy)", address: "Kariyalil House, Thadiyoor", phone: "" },
  { code: "H181", name: "Br. Thomaskutty Abraham", address: "Kaniamparambil Grace Villa, Thadiyoor", phone: "+91 7025325100" },
  { code: "H182", name: "Sr. Thresyamma Mathew", address: "Karimbanakuzyil Thadathil House, Kolabhagom", phone: "+91 7560934830" },
  { code: "H183", name: "Br. Tijin Thankanchan", address: "Cheruvila Puthenveedu, Thadiyoor", phone: "" },
  { code: "H184", name: "Tijo varughese", address: "Chellethu", phone: "" },
  { code: "H185", name: "Br. Titus Mathew", address: "Vellolikuzhyil House, Thadiyoor", phone: "" },
  { code: "H186", name: "Br. V.A Thomas", address: "Vazhayalil House, Thelliyoor", phone: "" },
  { code: "H187", name: "Br. V.T Thomas", address: "Vettirethu Maruthikal House, Thadiyoor", phone: "+91 9961719180" },
  { code: "H188", name: "Br. Varghese Simon", address: "Vazhayalil House, Thadiyoor", phone: "+91 9447265458" },
  { code: "H189", name: "Br. Varughese K Mathew", address: "Kallirikkumparambil House, Thadiyoor", phone: "+91 9539040394" },
  { code: "H190", name: "Br. Victor", address: "Kollakottu House, Thadiyoor", phone: "" },
  { code: "H191", name: "Br. Vijo K Philip", address: "Kadayatt Maruthuvelil (Kalloth) House, Thadiyoor", phone: "" },
  { code: "H192", name: "Br. W.G Mathews", address: "Weingamoottil House, Kolabhagom", phone: "" },
  { code: "H193", name: "Br. Wilson Abraham", address: "Vazhayalil House, Kolabhagom", phone: "" }
];

async function seedMembers() {
  console.log(`Starting insertion of ${rawData.length} members...`);

  if (isPostgres()) {
    console.log("Connected to PostgreSQL, clearing existing members and inserting fresh list...");
    await query("TRUNCATE TABLE members RESTART IDENTITY CASCADE");

    for (let i = 0; i < rawData.length; i++) {
      const m = rawData[i];
      await query(
        `INSERT INTO members (id, member_code, name, phone, address, status, photo_url, family_head)
         VALUES ($1, $2, $3, $4, $5, 'Active', '', '')`,
        [i + 1, m.code, m.name, m.phone, m.address]
      );
    }
    await query("SELECT setval(pg_get_serial_sequence('members', 'id'), (SELECT MAX(id) FROM members))");
    const countRes = await query("SELECT count(*)::int as count FROM members");
    console.log(`✅ Successfully seeded ${countRes.rows[0].count} members into PostgreSQL.`);
  }

  // Update memory store and local JSON files
  memoryStore.members = rawData.map((m, i) => ({
    id: i + 1,
    member_code: m.code,
    name: m.name,
    phone: m.phone,
    address: m.address,
    status: 'Active',
    photo_url: '',
    family_head: ''
  }));
  saveLocalStore();

  const publicLocalDbPath = path.join(__dirname, '../../public/data/local_db.json');
  if (fs.existsSync(publicLocalDbPath)) {
    try {
      const pubData = JSON.parse(fs.readFileSync(publicLocalDbPath, 'utf8').replace(/^\uFEFF/, ''));
      pubData.members = memoryStore.members;
      fs.writeFileSync(publicLocalDbPath, JSON.stringify(pubData, null, 2), 'utf8');
      console.log('✅ Updated public/data/local_db.json');
    } catch (e: any) {
      console.warn('Could not update public/data/local_db.json:', e.message);
    }
  }

  process.exit(0);
}

seedMembers().catch(err => {
  console.error("❌ Failed to seed members:", err);
  process.exit(1);
});
