function enableTech() {
	
}
function displayList() {
	
}
function mtlSelectionChanged(selected) {
	let techList = Engine.GetGUIObjectByName("myTechList");
	let selectedTech = techList.list[techList.selected];
}
class TechList extends TechtreeUtils
{
	constructor(page)
	{
		super();
		let techList = Engine.GetGUIObjectByName("myTechList");
		this.page = page;
		this.civCode = "";
		techList.onSelectionChange = this.onSelectionChange.bind(this);
	}
	onSelectionChange() {
		let techList = Engine.GetGUIObjectByName("myTechList");
		let selectedTech = techList.list[techList.selected];
		if (selectedTech == undefined)
			return;
		
		this.page.selectTech(selectedTech);
		this.page.draw(this.civCode);
	}
	predraw(civCode, techs, initIconSize, leftRows, rowSize)
	{	
		if (!techs)
			return;
		this.civCode = civCode;
		let techList = Engine.GetGUIObjectByName("tech_list");
		techList.hidden = false;
		const yTop = (initIconSize.top - (leftRows * rowSize));
		techList.size = "0 " + yTop + " 30% 98%";
		this.clearList();	
	}
	
	draw(page, civCode, techs, structure, data, selected)
	{
		if (!techs || !techs[structure]) {
			return;
		}
		let tech_data = [];
		for (let i = 0; i < techs[structure].length; ++i) {
			tech_data[i] = {};
			let t = techs[structure][i];
			let tech = data.techs[civCode][t];
			tech_data[i].name_id = t;
			tech_data[i].icon = 'icon="stretched:session/portraits/'+tech.icon+'"';
			tech_data[i].name = tech.name.generic;
		}
		this.displayList(tech_data, selected);
	}

	displayList(tech_data, selected) {
		let techList = Engine.GetGUIObjectByName("myTechList");
		let selectedTech = techList.list[techList.selected];
		//techList.selected = -1;
		
		techList.list_name = tech_data.map(e => e.name);
		techList.list = tech_data.map(e => e.name_id);
		
		if (selected != selectedTech) {
			techList.selected = techList.list.indexOf(selected);
		}
	}
	
	clearList()
	{
		let techList = Engine.GetGUIObjectByName("myTechList");
		if (techList.list == undefined || techList.list_name == undefined) {
			techList.selected = -1;
			techList.list_name = [];
			techList.list = [];
		}
	}
}