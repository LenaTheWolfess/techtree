class TechtreeButton
{
	constructor(parentPage)
	{
		this.parentPage = parentPage;

		this.techTreeButton = Engine.GetGUIObjectByName("techtreeButton");
		this.techTreeButton.onPress = this.onPress.bind(this);
		this.techTreeButton.caption = this.Caption;
		this.techTreeButton.tooltip = colorizeHotkey(this.Tooltip, this.Hotkey);
	}

	onPress()
	{
		Engine.PopGuiPage({ "civ": this.parentPage.activeCiv, "nextPage": "page_techtree.xml" });
	}

}

TechtreeButton.prototype.Caption =
	translate("Technology Tree");

TechtreeButton.prototype.Hotkey =
	"techtree";

TechtreeButton.prototype.Tooltip =
	translate("%(hotkey)s: Switch to Technology Tree.");
