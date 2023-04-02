class TechSection extends TechtreeUtils
{
	constructor()
	{
		super()
	}
	predraw(prefix, selectedTemplate, pSelectedTech, leftRows, rowSize, initIconSize, shift, data)
	{
		if (!selectedTemplate) {
			Engine.GetGUIObjectByName(prefix+"Section").hidden = true;
			Engine.GetGUIObjectByName(prefix+"GenericName").hidden = true;
			Engine.GetGUIObjectByName(prefix+"Icon").hidden = true;
			Engine.GetGUIObjectByName(prefix+"Description").hidden = true;
			Engine.GetGUIObjectByName(prefix+"Cost").hidden = true;
			return;
		}
		
		let root = Engine.GetGUIObjectByName(prefix+"Section");
		const xShift = 70;
		const ySize = 35;
		const yShift = shift > 0 ? ySize : 0;
		const yTop = (initIconSize.top - (leftRows * rowSize));
		root.size =  xShift + "% " + yTop + "+" + (yShift) + "% " + (xShift + 30) + "% " + (yTop + "+" + (yShift+ySize) ) + "%";
		root.hidden = false;
		root = Engine.GetGUIObjectByName(prefix+"GenericName");
		root.caption = selectedTemplate.name.generic;
		root.hidden = false;
		root = Engine.GetGUIObjectByName(prefix+"Icon");
		root.sprite = this.IconPath+selectedTemplate.icon;
		root.hidden = false;
		root = Engine.GetGUIObjectByName(prefix+"Description");
		if (selectedTemplate.tooltip)
			root.caption = selectedTemplate.tooltip || "";
		else
			root.caption = selectedTemplate.description || "";
		root.hidden = false;
		/*	
		root = Engine.GetGUIObjectByName(prefix+"Phase");
		if (pSelectedTech && pSelectedTech.phase) {
			root.hidden = false;
			root = Engine.GetGUIObjectByName(prefix+"PhaseGenericName");
			root.caption = data.phases[pSelectedTech.phase].name.generic;
			root.hidden = false;
			root = Engine.GetGUIObjectByName(prefix+"PhaseIcon");
			root.sprite = this.IconPath + data.phases[pSelectedTech.phase].icon;
			root.hidden = false;
		} else {
			root.hidden = true;
			Engine.GetGUIObjectByName(prefix+"PhaseGenericName").hidden = true;
			Engine.GetGUIObjectByName(prefix+"PhaseIcon").hidden = true;
		}
		*/
		root = Engine.GetGUIObjectByName(prefix+"Cost");
		let caption = "";
		let cc = 0;
		for (let key in selectedTemplate.cost) {
			if (selectedTemplate.cost[key]) {
				caption =  caption + '[icon="icon_'+ key +'"] ' + selectedTemplate.cost[key] +" ";
				cc++;
			}
		}
		if (!cc)
			caption = this.CostFree;
		root.caption = caption;
		root.hidden = false;
	}
}