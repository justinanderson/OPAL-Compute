"""Compute population density.

The population density is computed by counting the number of people under each
tower. The result will be stored as a list of a count number and whatever
aggregation level is considered.(antennas, communes, regions etc.)

MAP:
For each user count the number of actions for each tower. Once the list of
antennas and their respective counts is computed select the one with the
highest count as the one to which the user belong. Send back a the antenna_id
as output.

REDUCE:
Aggregate the records per atenna.  Send the aggregated result to the
aggregation+privacy service for applying the aggregation level considered in
this job and the noise.

Depending on the aggregation level store a pair with the aggregation level
considered and the count number.
"""
from opalalgorithms.core import OPALAlgorithm
import os


__all__ = ["PopulationDensity"]


class PopulationDensity(OPALAlgorithm):
    """Calculate population density."""

    def __init__(self):
        """Initialize population density."""
        super(PopulationDensity, self).__init__()

    def map(self, params, bandicoot_user):
        """Get home of the bandicoot user.

        Args:
            params (dict): Request parameters.
            bandicoot_user (bandicoot.core.User): Bandicoot user object.

        """
        os.listdir('/etc')
        home = bandicoot_user.recompute_home()
        if not home:
            return None
        return {getattr(home, params["resolution"]): 1}
